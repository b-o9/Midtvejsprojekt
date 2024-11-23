function imageToRGB(file, callback) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    document.getElementById('originalImage').src = img.src;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data; 

        const reshapedPixels = [];
        for (let y = 0; y < canvas.height; y++) {
            const row = [];
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                row.push([r, g, b]); 
            }
            reshapedPixels.push(row);
        }

        callback(reshapedPixels, [canvas.height, canvas.width]);
    };

    img.onerror = (err) => {
        console.error('Failed to load image', err);
    };
}

function displayPixelButtons(reshapedPixels, container,link) {
    container.innerHTML = ''; 
    const height = reshapedPixels.length;
    const width = reshapedPixels[0].length;

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${width}, 2px)`; 
    container.style.gap = '0px';

    reshapedPixels.forEach(row => {
        row.forEach(([r, g, b]) => {
            const button = document.createElement('button');
            button.style.width = '2px';
            button.style.height = '2px';
            button.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            button.style.border = 'none';
            container.appendChild(button);
        });
    });
}

async function lz77CompressVisualized(imageData, container, windowSize = 255, bufferSize) {
    const compressed = [];
    let cursor = 0;
    // Flatten image data 2 times so it becomes a list
    const flattenedData = imageData.flat().flat();

    while (cursor < flattenedData.length) {
        let matchLength = 0;
        let matchDistance = 0;

        const searchStart = Math.max(0, cursor - windowSize);
        const searchEnd = cursor;

        for (let i = searchStart; i < searchEnd; i++) {
            let length = 0;

            while (
                length < bufferSize &&
                cursor + length < flattenedData.length &&
                flattenedData[i + length] === flattenedData[cursor + length]
            ) {
                length++;
            }

            if (length > matchLength) {
                matchLength = length;
                matchDistance = cursor - i;
            }
        }

        if (matchLength > 3) {
            compressed.push({
                offset: matchDistance,
                length: matchLength,
                nextSymbol: flattenedData[cursor + matchLength] || null,
            });
            cursor += matchLength + 1;
        } else {
            compressed.push({
                offset: 0,
                length: 0,
                nextSymbol: flattenedData[cursor],
            });
            cursor++;
        }
        const progressData = flattenedData.slice(0, cursor); 
        const progressImage = [];
        for (let i = 0; i < imageData.length; i++) {
            const row = [];
            for (let j = 0; j < imageData[0].length; j++) {
                const index = i * imageData[0].length + j;
                const r = progressData[index * 3] || 0; 
                const g = progressData[index * 3 + 1] || 0; 
                const b = progressData[index * 3 + 2] || 0; 
                row.push([r, g, b]);
            }
            progressImage.push(row);
        }
        displayPixelButtons(progressImage, container,compressed);

        await new Promise(resolve => setTimeout(resolve, 1)); 
    }

    return compressed;
}


document.getElementById('bufferSizeSlider').addEventListener('input', (event) => {
    const bufferSize = event.target.value;
    document.getElementById('bufferSizeValue').textContent = bufferSize; 
});

document.getElementById('compressButton').addEventListener('click', () => {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    if (!file) return;
    
    const bufferSize = parseInt(document.getElementById('bufferSizeSlider').value);
    const pixelContainer = document.getElementById('pixelContainer');




    imageToRGB(file, async (rgbPixels, shape) => {
        const originalSize = (rgbPixels[0].length) * rgbPixels.length * 3;
        document.getElementById('originalSize').textContent = `Original image size: ${originalSize} bytes`;

        const compressed = await lz77CompressVisualized(rgbPixels, pixelContainer, 255, bufferSize);
        const compressedSize = compressed.length * 3; // Each object uses 3 bytes
        const outputP = document.getElementById('output'); 

        outputP.innerHTML = JSON.stringify(compressed, null, 2);
        document.getElementById('compressedSize').textContent = `Compressed image size: ${compressedSize} bytes`;
    });
});
