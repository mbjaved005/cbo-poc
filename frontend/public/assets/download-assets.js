const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const assets = [
  { url: 'http://localhost:3845/assets/b79382ef6d4005fab2d25c3e223cf3995b40ae53.svg', name: 'cbo-logo.svg' },
  { url: 'http://localhost:3845/assets/67504891dbcf644f535016499e1e2f5b04127352.svg', name: 'copy-icon.svg' },
  { url: 'http://localhost:3845/assets/0bac870b9297c3fa8db56c7fa5ade2fafe2e99db.svg', name: 'like-icon.svg' },
  { url: 'http://localhost:3845/assets/c05df1b225d4e67d8b83e1cdd795cc4721ccc4fa.svg', name: 'refresh-icon.svg' },
  { url: 'http://localhost:3845/assets/21825a95e8aaa03fbe1ff379be257c563f52e347.svg', name: 'group6.svg' },
  { url: 'http://localhost:3845/assets/4484c21ae1e2b96162f4522b3f3915cb76334876.svg', name: 'file-text.svg' },
  { url: 'http://localhost:3845/assets/0bc080abbdd53a86af9a5de54fba94c1dd000c7e.svg', name: 'paperclip.svg' },
  { url: 'http://localhost:3845/assets/f366b46fa9d9207f4b7d0b1a3c82c570e61ea5e6.png', name: 'rectangle1076.png' },
  { url: 'http://localhost:3845/assets/05cfb701daa6a40cc00267bed6e8282e211bc4fb.svg', name: 'stars.svg' },
  { url: 'http://localhost:3845/assets/8b45055fbf84d40db65433da1f9ce798f7f7d569.svg', name: 'mail-outline.svg' },
  { url: 'http://localhost:3845/assets/e8b2e6f6a0154e5efaf44e9e721d9aadc94408a1.svg', name: 'bookmark-outline.svg' },
  { url: 'http://localhost:3845/assets/f5197be06ed3c36a5362712c01ca77e7c8c3cfaf.svg', name: 'group.svg' },
  { url: 'http://localhost:3845/assets/e3afbd3da49d54970055322e8d623e90ab09301a.svg', name: 'line17.svg' },
  { url: 'http://localhost:3845/assets/bed37454d6b3814fcad6b0377246d212bc7ec1bc.svg', name: 'chevron-down.svg' },
  { url: 'http://localhost:3845/assets/9f06d37bf623c249ecca71d25a0d8d91000747f8.svg', name: 'group1.svg' },
  { url: 'http://localhost:3845/assets/6b27360542104bb3754ad49bbcfe0afd71c58d9f.svg', name: 'group2.svg' },
  { url: 'http://localhost:3845/assets/1c735bea4c1ea4a507fb3a3a9a19cac1c8a26963.svg', name: 'line18.svg' },
  { url: 'http://localhost:3845/assets/cb0ad159ec14c8c8772835d75af4f3d2578cb4e5.svg', name: 'group3.svg' },
  { url: 'http://localhost:3845/assets/6c4073e4544cb09942705a1911cc7e748ce1a3b6.svg', name: 'line16.svg' }
];

function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(filename);
    
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function downloadAllAssets() {
  console.log('Starting asset download...');
  
  for (const asset of assets) {
    try {
      await downloadFile(asset.url, asset.name);
    } catch (error) {
      console.error(`Failed to download ${asset.name}:`, error.message);
    }
  }
  
  console.log('Asset download completed!');
}

downloadAllAssets();
