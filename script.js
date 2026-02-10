document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('poster-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const posterImage = document.getElementById('poster-image');

    const displayTitle = document.getElementById('poster-title-display');
    const displayDesc = document.getElementById('poster-desc-display');
    const displayDate = document.getElementById('poster-date');

    const statusMsg = document.getElementById('status-msg');

    // Set today's date
    const today = new Date();
    displayDate.textContent = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    // --- Mode Switching Logic ---
    const radioButtons = document.querySelectorAll('input[name="image-source"]');
    const aiControls = document.getElementById('ai-controls');
    const uploadControls = document.getElementById('upload-controls');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'ai') {
                aiControls.classList.remove('hidden');
                uploadControls.classList.add('hidden');
                document.getElementById('accident-type').setAttribute('required', 'true');
            } else {
                aiControls.classList.add('hidden');
                uploadControls.classList.remove('hidden');
                document.getElementById('accident-type').removeAttribute('required');
            }
        });
    });

    // --- Form Submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const mode = document.querySelector('input[name="image-source"]:checked').value;
        const title = document.getElementById('accident-title').value;
        const desc = document.getElementById('accident-desc').value;

        // Update Text
        displayTitle.textContent = title;
        displayDesc.textContent = desc;

        // Handle Image based on mode
        if (mode === 'upload') {
            const fileInput = document.getElementById('image-upload');
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    posterImage.src = e.target.result;
                    statusMsg.textContent = "이미지가 업로드되었습니다.";
                    enableDownload();
                }
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                statusMsg.textContent = "이미지 파일을 선택해주세요.";
            }
            return; // Skip AI logic
        }

        // --- AI Mode Logic ---
        const type = document.getElementById('accident-type').value;
        const apiKey = document.getElementById('api-key').value;

        loadingOverlay.classList.remove('hidden');
        statusMsg.textContent = "이미지 생성 요청 중...";

        try {
            if (apiKey && apiKey.startsWith('sk-')) {
                statusMsg.textContent = "DALL·E 3로 이미지를 생성하고 있습니다...";
                await generateImageWithOpenAI(apiKey, type, desc);
            } else {
                // DEMO MODE
                await simulateDelay(1500);
                setDemoImage(type);
                statusMsg.textContent = "데모 이미지가 적용되었습니다. (API 키 없음)";
                enableDownload();
            }
        } catch (error) {
            console.error(error);
            statusMsg.textContent = "오류 발생: " + error.message;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    // --- OpenAI API Integration ---
    async function generateImageWithOpenAI(apiKey, type, description) {
        const prompt = `
            Nano Banana style illustration, flat graphic, bold outlines, simple color blocks, 
            no photorealism, stable body proportions, yellow/red/black warning colors.
            Industrial safety poster context. 
            Accident Type: ${type}.
            Scene: ${description}.
            Worker with hard hat and safety vest.
            Danger, caution, severe accident warning.
            Neutral face, no gore, no blood.
        `.replace(/\s+/g, ' ').trim();

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                style: "vivid" // or natural
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API 요청 실패');
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;

        // Note: DALL-E URLs expire after an hour.
        // For a real app, you'd proxy and save this.
        posterImage.src = imageUrl;
        statusMsg.textContent = "이미지가 성공적으로 생성되었습니다!";
        enableDownload();
    }

    function setDemoImage(type) {
        // Map accident types to assets
        const assets = {
            'fall': 'assets/fall_sample.png',
            'caught_in': 'assets/caught_in_sample.png',
            'collision': 'assets/collision_sample.png',
            'shock': 'assets/shock_sample.png',
            'trip': 'assets/trip_sample.png',
            'collapse': 'assets/collapse_sample.png',
            'other': 'assets/default_sample.png'
        };

        const imagePath = assets[type] || assets['other'];
        posterImage.src = imagePath;
        posterImage.onerror = function () {
            this.src = 'https://via.placeholder.com/400x400?text=No+Image+Available';
        };
    }

    function simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // --- Download Functionality ---
    const btnDownload = document.getElementById('btn-download');

    btnDownload.addEventListener('click', async () => {
        const poster = document.getElementById('poster');

        try {
            btnDownload.textContent = "이미지 생성 중...";
            btnDownload.disabled = true;

            const canvas = await html2canvas(poster, {
                scale: 2, // Higher resolution
                useCORS: true, // Enable cross-origin for images
                backgroundColor: null
            });

            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `siren-poster-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            btnDownload.textContent = "이미지 저장 완료!";
            setTimeout(() => {
                btnDownload.textContent = "이미지 저장";
                btnDownload.disabled = false;
            }, 2000);

        } catch (err) {
            console.error(err);
            alert('이미지 저장 중 오류가 발생했습니다: ' + err.message);
            btnDownload.textContent = "이미지 저장";
            btnDownload.disabled = false;
        }
    });

    // Enable download button when image is ready
    function enableDownload() {
        btnDownload.disabled = false;
    }

    // --- API Key Storage ---
    const apiKeyInput = document.getElementById('api-key');
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    // Only save valid keys (simple check)
    apiKeyInput.addEventListener('change', () => {
        const val = apiKeyInput.value.trim();
        if (val.startsWith('sk-')) {
            localStorage.setItem('openai_api_key', val);
        }
    });
});
