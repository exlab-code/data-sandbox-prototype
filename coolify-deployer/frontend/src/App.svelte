// App.svelte - Main application component

<script>
  import { onMount } from 'svelte';
  import Toast from './components/Toast.svelte';
  
  // Application state
  let username = '';
  let selectedApp = null;
  let deploymentStatus = 'idle'; // idle, validating, deploying, success, error
  let deploymentUrl = '';
  let errorMessage = '';
  let showToast = false;
  let toastMessage = '';
  let toastType = 'info'; // info, success, error
  
  // Available applications
  const apps = [
    { 
      id: 'metabase', 
      name: 'Metabase', 
      description: 'Easy-to-use analytics and visualization tool',
      icon: '/icons/metabase.svg'
    },
    { 
      id: 'superset', 
      name: 'Apache Superset', 
      description: 'Modern data exploration and visualization platform',
      icon: '/icons/superset.svg'
    }
  ];
  
  // Username validation
  function validateUsername(username) {
    const pattern = /^[a-zA-Z0-9_]{3,30}$/;
    return pattern.test(username);
  }
  
  // Display toast notification
  function showNotification(message, type = 'info') {
    toastMessage = message;
    toastType = type;
    showToast = true;
    
    setTimeout(() => {
      showToast = false;
    }, 5000);
  }
  
  // Handle app selection
  function selectApp(app) {
    selectedApp = app;
  }
  
  // Handle deployment
  async function deployApp() {
    // Validate username
    if (!validateUsername(username)) {
      showNotification('Username must be 3-30 alphanumeric characters or underscores', 'error');
      return;
    }
    
    // Validate app selection
    if (!selectedApp) {
      showNotification('Please select an application to deploy', 'error');
      return;
    }
    
    // Start deployment process
    deploymentStatus = 'validating';
    
    try {
      // Call the backend API to deploy the app
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          app: selectedApp.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed');
      }
      
      // Update state
      deploymentStatus = 'deploying';
      
      // Save username to local storage
      localStorage.setItem('username', username);
      
      // Poll for deployment status
      checkDeploymentStatus(data.deploymentId);
    } catch (error) {
      deploymentStatus = 'error';
      errorMessage = error.message;
      showNotification(`Deployment failed: ${error.message}`, 'error');
    }
  }
  
  // Check deployment status
  async function checkDeploymentStatus(deploymentId) {
    try {
      const response = await fetch(`/api/status/${deploymentId}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        deploymentStatus = 'success';
        deploymentUrl = data.url;
        showNotification('Deployment successful!', 'success');
      } else if (data.status === 'failed') {
        deploymentStatus = 'error';
        errorMessage = data.error || 'Deployment failed';
        showNotification(`Deployment failed: ${errorMessage}`, 'error');
      } else {
        // Still deploying, check again in a few seconds
        setTimeout(() => checkDeploymentStatus(deploymentId), 5000);
      }
    } catch (error) {
      deploymentStatus = 'error';
      errorMessage = error.message;
      showNotification(`Failed to check deployment status: ${error.message}`, 'error');
    }
  }
  
  // Load saved username on mount
  onMount(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      username = savedUsername;
    }
  });
</script>

<main class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-lg mx-auto">
    {#if showToast}
      <Toast message={toastMessage} type={toastType} />
    {/if}
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Data Sandbox Deployer</h1>
      <p class="mt-2 text-gray-600">Deploy your own data analytics platform with one click</p>
    </div>
    
    {#if deploymentStatus === 'idle' || deploymentStatus === 'error'}
      <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6">
        <form class="mb-0 space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
            <div class="mt-1">
              <input
                bind:value={username}
                id="username"
                name="username"
                type="text"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Choose a unique username (3-30 characters)"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">This will be used for your subdomain: username.ex-lab.de</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Application</label>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {#each apps as app}
                <button
                  type="button"
                  class={`relative block p-4 border ${selectedApp?.id === app.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'} rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  on:click={() => selectApp(app)}
                >
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <img src={app.icon} alt={app.name} class="h-10 w-10" />
                    </div>
                    <div class="ml-4 text-left">
                      <p class="text-base font-medium text-gray-900">{app.name}</p>
                      <p class="text-sm text-gray-500">{app.description}</p>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
          
          <div>
            <button
              type="button"
              on:click={deployApp}
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={!username || !selectedApp}
            >
              Deploy Application
            </button>
          </div>
          
          {#if deploymentStatus === 'error'}
            <div class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">Deployment Error</h3>
                  <div class="mt-2 text-sm text-red-700">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </form>
      </div>
    {:else if deploymentStatus === 'validating' || deploymentStatus === 'deploying'}
      <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">
            {deploymentStatus === 'validating' ? 'Validating your request...' : 'Deploying your application...'}
          </h3>
          <p class="text-sm text-gray-500">
            {deploymentStatus === 'validating' 
              ? 'Checking if your username is available.' 
              : 'This may take a few minutes. Please don\'t close this window.'}
          </p>
          
          {#if deploymentStatus === 'deploying'}
            <div class="mt-6">
              <div class="relative pt-1">
                <div class="flex mb-2 items-center justify-between">
                  <div>
                    <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Deployment in progress
                    </span>
                  </div>
                </div>
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div class="w-full bg-blue-500 animate-pulse h-full"></div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else if deploymentStatus === 'success'}
      <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">Deployment Successful!</h3>
          <p class="text-sm text-gray-500 mb-4">Your application is now ready to use.</p>
          
          <div class="rounded-md bg-gray-50 p-4 mb-4">
            <div class="flex">
              <div class="ml-3 w-full">
                <h3 class="text-sm font-medium text-gray-800">Your application URL:</h3>
                <p class="mt-2 text-sm text-blue-700 break-all">
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" class="font-bold hover:underline">
                    {deploymentUrl}
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            on:click={() => deploymentStatus = 'idle'}
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Deploy Another Application
          </button>
        </div>
      </div>
    {/if}
    
    <div class="text-center text-xs text-gray-500">
      <p>GDPR-compliant analytics platform for German non-profits</p>
      <p class="mt-1">All data is stored on German servers (Hetzner)</p>
    </div>
  </div>
</main>


