//Import dependencies
var vcfReader = require('./index.js');

//Read the test file
vcfReader('./test.vcf', function(error, meta, header, data)
{
  //Check for error
  if(error){ return console.error(error.message); }

  //Display the header
  console.log('Header: ' + header.join(' | '));

  //Print the number of meta lines
  console.log('Meta elements: ' + meta.length);

  //Print the number of data elements
  console.log('Data elements: ' + data.length);

  //Print the first data element
  //console.log(data[0]);
});
