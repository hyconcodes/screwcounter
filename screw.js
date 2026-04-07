const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const imagePreview = document.getElementById('image-preview');
const countBtn = document.getElementById('count-btn');
const cancelBtn = document.getElementById('cancel-btn');
const resultSection = document.getElementById('result-section');
const loadingSpinner = document.getElementById('loading-spinner');
const resultContent = document.getElementById('result-content');

let currentBase64Image = null;

// Handle drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length) {
        handleFiles(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length) {
        handleFiles(files[0]);
    }
}

function handleFiles(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(e) {
        currentBase64Image = e.target.result;
        imagePreview.src = currentBase64Image;
        
        // Hide upload, show preview
        dropZone.classList.add('hidden');
        previewSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
    }
}

cancelBtn.addEventListener('click', () => {
    currentBase64Image = null;
    fileInput.value = '';
    dropZone.classList.remove('hidden');
    previewSection.classList.add('hidden');
    resultSection.classList.add('hidden');
});

countBtn.addEventListener('click', async () => {
    if (!currentBase64Image) return;

    // Show loading UI
    countBtn.disabled = true;
    cancelBtn.disabled = true;
    resultSection.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    resultContent.classList.add('hidden');

    try {
        // Roboflow requires the raw base64 string without the prefix (e.g., data:image/png;base64,)
        const base64Data = currentBase64Image.split(',')[1];

        const response = await fetch('https://serverless.roboflow.com/hycons-workspace/workflows/screwcounter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: 'a5PBSFBZDjnhNq0ZK9vd',
                inputs: {
                    "image": {
                        "type": "base64",
                        "value": base64Data
                    }
                }
            })
        });

        const result = await response.json();
        
        // Log to console first
        console.log("Screw Counter Result: ", result);
        
        // Print result visually in the UI box
        loadingSpinner.classList.add('hidden');
        resultContent.classList.remove('hidden');
        if (result && result.outputs && result.outputs.length > 0) {
            const output = result.outputs[0];
            const predictions = output.model_predictions?.predictions || [];
            const objCount = predictions.length;
            const aiText = output.google_gemini_1_output || "Analysis complete.";
            let base64Img = output.bounding_box_visualization_image?.value || currentBase64Image;
            
            // Re-add prefix if Roboflow returned raw base64
            if (base64Img && !base64Img.startsWith('data:image') && !base64Img.startsWith('http')) {
                 base64Img = `data:image/jpeg;base64,${base64Img}`;
            }

            resultContent.innerHTML = `
                <div class="result-stats">
                    <div class="stat-box">
                        <div class="stat-value">${objCount}</div>
                        <div class="stat-label">Screws Detected</div>
                    </div>
                </div>
                
                <div class="result-card">
                    <h4>AI Summary</h4>
                    <p class="ai-summary">${aiText}</p>
                </div>

                <div class="result-card result-image-box">
                    <h4>Visualization</h4>
                    <img src="${base64Img}" alt="Bounding Boxes">
                </div>
            `;
        } else {
            resultContent.textContent = "No valid output received from the model.";
        }

    } catch (error) {
        console.error('Error during prediction:', error);
        loadingSpinner.classList.add('hidden');
        resultContent.classList.remove('hidden');
        resultContent.textContent = `Error: ${error.message}`;
    } finally {
        countBtn.disabled = false;
        cancelBtn.disabled = false;
    }
});
