<script>
  export let message;
  export let type = 'info'; // info, success, error
  
  const typeClasses = {
    info: 'bg-blue-50 text-blue-800',
    success: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800'
  };
  
  const iconClasses = {
    info: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400'
  };
</script>

<div class="fixed inset-x-0 top-4 flex items-center justify-center z-50 px-4">
  <div class={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ${typeClasses[type]}`}>
    <div class="p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          {#if type === 'info'}
            <svg class={`h-6 w-6 ${iconClasses[type]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {:else if type === 'success'}
            <svg class={`h-6 w-6 ${iconClasses[type]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {:else if type === 'error'}
            <svg class={`h-6 w-6 ${iconClasses[type]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {/if}
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium">
            {message}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button on:click={() => { showToast = false; }} class={`inline-flex ${iconClasses[type]}`}>
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>