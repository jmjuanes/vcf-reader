//Import dependencies
var pstat = require('pstat');
var readl = require('readl-async');

//VCF reader object
var vcfReader = function(file, opt, cb)
{
  //Save the file
  this._file = file;

  //Save the callback function
  this._cb = (typeof opt === 'function') ? opt : cb;

  //Check the options
  if(typeof opt === 'function'){ opt = {}; }

  //Check the encoding
  this._encoding = (typeof opt.encoding === 'undefined') ? 'utf8' : opt.encoding;

  //Set the default chunk size
  this._chunk = (typeof opt.chunk === 'undefined') ? 4098 : opt.chunk;

  //Output object
  this._out = { meta: [], header: [], data: [] };

  //Return this
  return this;
};

//Reader function
vcfReader.prototype.read = function()
{
  //Check if file exists
  if(pstat.isFileSync(this._file) === false){ return this._cb(new Error('File ' + this._file + ' not found')); }

  //Create the file reader
  var reader = new readl(this._file, { encoding: this._encoding, emptyLines: false, chunk: this._chunk });

  //Save this
  var self = this;

  //Read line function
  reader.on('line', function(line, index)
  {
    //Check the first character
    if(line.charAt(0) !== '#')
    {
      //parse the data line
      return self.addData(line, index);
    }
    else if(line.charAt(1) !== '#')
    {
      //Parse the header line
      return self.addHeader(line, index);
    }
    else
    {
      //Save as a metadata
      return self.addMeta(line, index);
    }

    //Continue
    return true;
  });

  //Error function
  reader.on('error', function(e){ return self._cb(e); });

  //End function
  reader.on('end', function()
  {
    //Do the callback
    return self._cb(false, self._out.meta, self._out.header, self._out.data);
  });

  //Read the vcf file
  reader.read();
};

//Display an error and exit
vcfReader.prototype.error = function(message, ret)
{
  //Do the callback with the error
  this._cb(new Error(message));

  //Return false
  return ret;
};

//Parse the meta line
vcfReader.prototype.addMeta = function(line, index)
{
  //Save the meta line
  this._out.meta.push(line.replace('##', ''));

  //Continue
  return true;
};

//Parse the header line
vcfReader.prototype.addHeader = function(line, index)
{
  //Parse the line
  this._out.header = line.replace('#', '').split('\t');

  //Convert to lower case
  for(var i = 0; i < Math.min(9, this._out.header.length); i++)
  {
    //Convert to lower case
    this._out.header[i] = this._out.header[i].toLowerCase();
  }

  //Continue
  return true;
};

//Parse the data line
vcfReader.prototype.addData = function(line, index)
{
  //Split the line
  line = line.split('\t');

  //Check the header length
  if(this._out.header.length === 0){ return this.error('No header on VCF file found', false); }

  //Check the number of columns
  if(this._out.header.length !== line.length){ return this.error('Line ' + index + ' has not the same number columns as the header', false); }

  //Initialize the row object
  var obj = {};

  //Add the headers
  for(var i = 0; i < this._out.header.length; i++)
  {
    //Check the index
    if(i >= line.length){ break; }

    //Get the key name
    var key = this._out.header[i];

    //Get the value
    var value = line[i];

    //Check the index
    if(i >= 9 || key === 'format')
    {
      //Parse the format value
      value = this.parseFormat(value);
    }

    //Check for info
    else if(key === 'info')
    {
      //Parse the info value
      value = this.parseInfo(value);
    }

    //Add the column
    obj[key] = value;
  }

  //Add to the list
  this._out.data.push(obj);

  //Continue
  return true;
};

//Parse data format
vcfReader.prototype.parseFormat = function(value){ return value.split(':'); };

//Parse data info
vcfReader.prototype.parseInfo = function(value)
{
  //Initialize the output object
  var out = {};

  //Split the content by ;
  value = value.split(';');

  //Read all the elements
  for(var i = 0; i < value.length; i++)
  {
    //Get the item
    var item = value[i].split('=');

    //Check the length
    if(item.length !== 2){ continue; }

    //Save
    out[item[0]] = item[1];
  }

  //Return the object
  return out;
};

//Exports to node
module.exports = function(file, opt, cb)
{
  //Get the new vcf reader object
  var vcf = new vcfReader(file, opt, cb);

  //Read the file
  vcf.read();
};
