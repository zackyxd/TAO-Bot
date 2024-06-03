const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

const apiKey = '0f7cae065493467d032fa99fd2bbe2c3'; // Replace with your actual API key from ImgBB

async function uploadImagesToImgBB(imageFolder, jsonFilePath) {
  // Read the existing JSON file if it exists, or create an empty object
  let imageLinks = {};
  if (fs.existsSync(jsonFilePath)) {
    const data = fs.readFileSync(jsonFilePath);
    imageLinks = JSON.parse(data);
  }

  // Read all files in the new folder
  const files = fs.readdirSync(imageFolder);
  for (const file of files) {
    console.log(file);
    const imagePath = `${imageFolder}/${file}`;
    const imageBuffer = fs.readFileSync(imagePath);

    // Create FormData and append the image buffer
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64'));
    formData.append('key', apiKey); // Append the API key here

    // Upload the image to ImgBB
    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        // Update the link in the dictionary with the file name as the key
        imageLinks[file] = result.data.url;
      } else {
        console.error(`Failed to upload image ${file}:`, result.data.error);
      }
    } catch (error) {
      console.error(`An error occurred while uploading ${file}:`, error);
    }
  }

  // Write the updated dictionary back to the JSON file
  fs.writeFileSync(jsonFilePath, JSON.stringify(imageLinks, null, 2));
  console.log(`Updated image links have been saved to ${jsonFilePath}`);
}

// Example usage:
const newImageFolder = 'badges/'; // Replace with the path to your new image folder
const jsonFilePath = 'imageLinks.json'; // The path to your existing JSON file
uploadImagesToImgBB(newImageFolder, jsonFilePath)