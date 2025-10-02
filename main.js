const API_URL = 'http://localhost:3000/api';

let sessionId = null;

// Elements
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const linkedInProfileUrl = document.getElementById('linkedInProfileUrl');
const uploadSection = document.getElementById('uploadSection');
const chatSection = document.getElementById('chatSection');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const locationPrompt = document.getElementById('locationPrompt');
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const jobsSection = document.getElementById('jobsSection');
const jobsList = document.getElementById('jobsList');

// Upload handlers
uploadBox.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a PDF file');
    return;
  }

  const formData = new FormData();
  formData.append('resume', file);

  // Add LinkedIn profile URL if provided
  const linkedInUrl = linkedInProfileUrl.value.trim();
  if (linkedInUrl) {
    formData.append('linkedInProfileUrl', linkedInUrl);
  }

  try {
    uploadBox.innerHTML = '<div class="loading">Processing your resume...</div>';

    const response = await fetch(`${API_URL}/upload-resume`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.sessionId) {
      sessionId = data.sessionId;
      uploadSection.style.display = 'none';
      chatSection.style.display = 'block';
      addMessage(data.message, 'assistant');
    } else {
      throw new Error('Failed to process resume');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to upload resume. Please try again.');
    uploadBox.innerHTML = `
      <div class="upload-icon">📄</div>
      <div class="upload-text">Drop your resume here or click to upload</div>
      <div class="upload-hint">PDF files only</div>
    `;
  }
}

// Chat handlers
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  messageInput.value = '';
  sendBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        message
      })
    });

    const data = await response.json();

    if (data.message.includes('READY:')) {
      // Extract the user-facing message (before READY:)
      const parts = data.message.split('READY:');
      if (parts[0].trim()) {
        addMessage(parts[0].trim(), 'assistant');
      }
      // Show location prompt
      locationPrompt.style.display = 'block';
    } else {
      addMessage(data.message, 'assistant');
    }
  } catch (error) {
    console.error('Error:', error);
    addMessage('Sorry, something went wrong. Please try again.', 'assistant');
  } finally {
    sendBtn.disabled = false;
  }
}

function addMessage(text, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Job search handlers
searchBtn.addEventListener('click', searchJobs);
locationInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchJobs();
  }
});

async function searchJobs() {
  const location = locationInput.value.trim();
  if (!location) {
    alert('Please enter a location');
    return;
  }

  searchBtn.disabled = true;
  jobsList.innerHTML = '<div class="loading">Searching for jobs...</div>';
  jobsSection.style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/search-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        location
      })
    });

    const data = await response.json();

    if (data.jobs && data.jobs.length > 0) {
      displayJobs(data.jobs);
    } else {
      jobsList.innerHTML = '<p>No jobs found. Please try a different location or criteria.</p>';
    }
  } catch (error) {
    console.error('Error:', error);
    jobsList.innerHTML = '<p>Failed to search jobs. Please try again.</p>';
  } finally {
    searchBtn.disabled = false;
  }
}

function displayJobs(jobs) {
  jobsList.innerHTML = '';

  jobs.forEach(job => {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';

    jobCard.innerHTML = `
      <div class="job-title">${job.title}</div>
      <div class="job-company">${job.company}</div>
      <div class="job-location">${job.location}</div>
      <div class="job-description">${job.description}</div>
      <div class="job-requirements">
        <h4>Requirements:</h4>
        <ul>
          ${job.requirements.map(req => `<li>${req}</li>`).join('')}
        </ul>
      </div>
      <div class="job-match">
        <strong>Why this matches:</strong> ${job.matchReason}
      </div>
      <a href="${job.url}" target="_blank" class="job-link">View on LinkedIn →</a>
    `;

    jobsList.appendChild(jobCard);
  });
}
