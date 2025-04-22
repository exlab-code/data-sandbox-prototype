<script>
  import { onMount, onDestroy } from 'svelte';
  import Toast from './components/Toast.svelte';
  
  // Application state
  let projectName = '';
  let selectedApp = null;
  let deploymentStatus = 'idle'; // idle, validating, deploying, success, error
  let deploymentUrl = '';
  let errorMessage = '';
  let showToast = false;
  let toastMessage = '';
  let toastType = 'info'; // info, success, error
  
  // Deployment progress tracking
  let deploymentId = null;
  let progressStep = '';
  let progressPercentage = 0;
  let statusPollingInterval = null;
  
  // List of URL-friendly adjectives and nouns for project names
  const adjectives = [
    'cool', 'mega', 'super', 'pro', 'turbo', 
    'blitz', 'smart', 'clever', 'stark', 'toll', 
    'rapid', 'agil', 'power', 'hyper', 'ultra'
  ];
  
  const nouns = [
    'panda', 'tiger', 'adler', 'dino', 'wolf', 
    'drache', 'hai', 'igel', 'luchs', 'falke', 
    'bison', 'dachs', 'fuchs', 'kobra', 'orca'
  ];
  
  // Generate a random funny project name
  function generateRandomName() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    // Use a random number to further ensure uniqueness
    const randomNum = Math.floor(Math.random() * 1000);
    
    return `${randomAdjective}-${randomNoun}-${randomNum}`.toLowerCase();
  }
  
  // Available applications
  const apps = [
    { 
      id: 'metabase', 
      name: 'Metabase', 
      description: 'Einfaches Analyse- und Visualisierungstool',
      icon: '/icons/metabase.svg'
    },
    { 
      id: 'grafana', 
      name: 'Grafana', 
      description: 'Monitoring- und Observability-Plattform',
      icon: '/icons/grafana.svg'
    },
    { 
      id: 'lightdash', 
      name: 'Lightdash', 
      description: 'Business Intelligence für dbt-Nutzer',
      icon: '/icons/lightdash.svg'
    }
  ];
  
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
  
  // Poll deployment status from the backend
  async function pollDeploymentStatus() {
    if (!deploymentId) return;
    
    try {
      const response = await fetch(`/status/${deploymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status API response error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update progress information
      progressStep = data.step || '';
      progressPercentage = data.progress || 0;
      
      console.log('Status update:', data);
      
      // Check if deployment has completed or failed
      if (data.status === 'success') {
        deploymentStatus = 'success';
        deploymentUrl = data.url;
        
        showNotification('Bereitstellung erfolgreich!', 'success');
        
        // Clear the polling interval
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;
      } else if (data.status === 'error') {
        deploymentStatus = 'error';
        errorMessage = data.step || 'Ein Fehler ist während der Bereitstellung aufgetreten';
        showNotification(`Bereitstellung fehlgeschlagen: ${errorMessage}`, 'error');
        
        // Clear the polling interval
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;
      }
      
    } catch (error) {
      console.error('Fehler beim Abrufen des Bereitstellungsstatus:', error);
    }
  }
  
  // Handle deployment
  async function deployApp() {
    if (!selectedApp) {
      showNotification('Bitte wähle eine Anwendung zum Bereitstellen aus', 'error');
      return;
    }

    deploymentStatus = 'deploying';
    progressStep = 'Starte Bereitstellung';
    progressPercentage = 0;

    try {
      const response = await fetch('/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectName: projectName,
          appType: selectedApp.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Deploy API response error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.stderr || 'Bereitstellung fehlgeschlagen');
      }

      console.log('Deployment started:', data);

      // Save the deployment ID for status polling
      deploymentId = data.deploymentId || `${projectName}-${selectedApp.id}`;
      
      // Start polling for status updates every 3 seconds
      statusPollingInterval = setInterval(pollDeploymentStatus, 3000);
      
      showNotification('Bereitstellung erfolgreich gestartet', 'info');

    } catch (error) {
      deploymentStatus = 'error';
      errorMessage = error.message;
      showNotification(`Bereitstellung fehlgeschlagen: ${error.message}`, 'error');
    }
  }
  
  // Cancel deployment and reset state
  function cancelDeployment() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
    
    deploymentStatus = 'idle';
    deploymentId = null;
    progressStep = '';
    progressPercentage = 0;
    projectName = generateRandomName();
  }
  
  // Clean up polling interval on component destruction
  onDestroy(() => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }
  });
  
  // Generate a random project name on mount
  onMount(() => {
    projectName = generateRandomName();
  });
</script>

<main class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-lg mx-auto">
    {#if showToast}
      <Toast message={toastMessage} type={toastType} />
    {/if}
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Data Sandbox Deployer</h1>
      <p class="mt-2 text-gray-600">Deine eigene Datenanalyse-Plattform mit einem Klick bereitstellen</p>
    </div>
    
    {#if deploymentStatus === 'idle' || deploymentStatus === 'error'}
      <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6">
        <form class="mb-0 space-y-6">
          <div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Projektname</label>
              <div class="bg-gray-100 p-3 rounded-md border border-gray-300">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div class="ml-3 text-sm font-medium text-gray-900">
                    {projectName}
                  </div>
                </div>
              </div>
              <p class="mt-1 text-xs text-gray-500">Dies wird für deine Subdomain verwendet: {projectName}.ex-lab.de</p>
            </div>
            
            <label class="block text-sm font-medium text-gray-700 mb-2">Anwendung auswählen</label>
            <div class="flex flex-col space-y-3">
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
              disabled={!selectedApp}
            >
              Anwendung bereitstellen
            </button>
          </div>
          
          {#if deploymentStatus === 'error'}
            <div class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">Bereitstellungsfehler</h3>
                  <div class="mt-2 text-sm text-red-700">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </form>
      </div>
    {:else if deploymentStatus === 'deploying'}
      <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">
            Stelle {selectedApp?.name} bereit
          </h3>
          <p class="text-sm text-gray-500 mb-2">
            {progressStep}
          </p>
          
          <div class="mt-6">
            <div class="relative pt-1">
              <div class="flex mb-2 items-center justify-between">
                <div>
                  <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Bereitstellung in Bearbeitung - {progressPercentage}%
                  </span>
                </div>
              </div>
              <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div 
                  class="w-0 bg-blue-500 h-full transition-all duration-500 ease-out"
                  style="width: {progressPercentage}%">
                </div>
              </div>
            </div>
            
            <button
              type="button"
              on:click={cancelDeployment}
              class="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Bereitstellung abbrechen
            </button>
          </div>
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
          <h3 class="text-lg font-medium text-gray-900 mb-1">Bereitstellung erfolgreich!</h3>
          <p class="text-sm text-gray-500 mb-4">Deine Anwendung wird jetzt eingerichtet.</p>
          
          
          <div class="rounded-md bg-gray-50 p-4 mb-4">
            <div class="flex">
              <div class="ml-3 w-full">
                <h3 class="text-sm font-medium text-gray-800">Deine Anwendungs-URL:</h3>
                <p class="mt-2 text-sm text-blue-700 break-all">
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" class="font-bold hover:underline">
                    {deploymentUrl}
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <a 
            href={deploymentUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4"
          >
            Anwendung öffnen
          </a>
          
          {#if selectedApp?.id === 'grafana'}
            <div class="rounded-md bg-blue-50 p-4 mb-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1 .257-.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-blue-800">Grafana Login-Informationen</h3>
                  <div class="mt-2 text-sm text-blue-700">
                    <p><strong>Benutzername:</strong> admin</p>
                    <p><strong>Passwort:</strong> admin</p>
                    <p class="mt-1 text-xs">Bitte ändere das Passwort nach dem ersten Login!</p>
                  </div>
                </div>
              </div>
            </div>
          {/if}
          
          <div class="rounded-md bg-gray-50 p-4 mb-4">
            <div class="flex">
              <div class="ml-3 w-full">
                <h3 class="text-sm font-medium text-gray-800">Dein Projektname:</h3>
                <p class="mt-2 text-sm text-gray-700 break-all font-mono">
                  {projectName}
                </p>
                <p class="mt-1 text-xs text-gray-500">
                  Speichere diesen Namen, falls du später darauf zurückgreifen möchtest.
                </p>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            on:click={() => {
              deploymentStatus = 'idle'; 
              projectName = generateRandomName();
              selectedApp = null;
            }}
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Weitere Anwendung bereitstellen
          </button>
        </div>
      </div>
    {/if}
    
    <!-- Enhanced features section -->
    <div class="bg-white py-6 px-6 shadow rounded-lg sm:px-10 mb-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4 text-center">Funktionen</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-3 rounded-md bg-blue-50">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">DSGVO-konform</h3>
              <p class="text-sm text-blue-700">Alle Daten werden auf deutschen Servern gespeichert</p>
            </div>
          </div>
        </div>
        
        <div class="p-3 rounded-md bg-green-50">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">Einfache Bereitstellung</h3>
              <p class="text-sm text-green-700">Starte dein eigenes Dashboard in weniger als einer Minute</p>
            </div>
          </div>
        </div>
        
        <div class="p-3 rounded-md bg-purple-50">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-purple-800">Mehrere Tools</h3>
              <p class="text-sm text-purple-700">Wähle zwischen Metabase, Grafana und Lightdash</p>
            </div>
          </div>
        </div>
        
        <div class="p-3 rounded-md bg-yellow-50">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">Schnell und zuverlässig</h3>
              <p class="text-sm text-yellow-700">Optimiert für deutsche Non-Profit-Organisationen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="text-center text-xs text-gray-500">
      <p>DSGVO-konforme Analyse-Plattform für deutsche Non-Profit-Organisationen</p>
      <p class="mt-1">Alle Daten werden auf deutschen Servern (Hetzner) gespeichert</p>
    </div>
  </div>
</main>
