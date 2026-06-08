require('dotenv').config();
const filesModel = require('./src/features/files/files.model');

async function test() {
  try {
    const data = await filesModel.findFileWithAccess('SOME_FILE_ID', 'SOME_USER_ID');
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
