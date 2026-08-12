(function(){
  var search=document.querySelector('[data-search]');
  var duplicates=document.querySelector('[data-duplicates]');
  var projects=document.querySelector('[data-projects]');
  var toast=document.querySelector('[data-toast]');
  function show(message){toast.textContent=message;toast.classList.add('visible');setTimeout(function(){toast.classList.remove('visible')},2800)}
  function filter(){var query=search.value.trim().toLowerCase();var visible=0;projects.querySelectorAll('article').forEach(function(card){var match=(card.getAttribute('data-name')||'').toLowerCase().includes(query);card.classList.toggle('hidden',!match);if(match)visible++});duplicates.querySelectorAll('.duplicate-row').forEach(function(row){var match=(row.getAttribute('data-name')||'').toLowerCase().includes(query);row.classList.toggle('hidden',!match)});document.querySelector('[data-result-count]').textContent=visible+(visible===1?' visible record':' visible records')}
  search.addEventListener('input',filter);
  document.querySelector('[data-sort]').addEventListener('change',function(event){var rows=[].slice.call(duplicates.querySelectorAll('.duplicate-row'));rows.sort(function(a,b){var left=Number(a.getAttribute('data-score'));var right=Number(b.getAttribute('data-score'));return event.target.value==='asc'?left-right:right-left});rows.forEach(function(row){duplicates.appendChild(row)});show(event.target.value==='asc'?'Sorted by lowest overlap.':'Sorted by highest overlap.')});
  document.addEventListener('click',function(event){var target=event.target;if(!(target instanceof Element))return;var nav=target.closest('[data-view]');if(nav){document.querySelectorAll('[data-view]').forEach(function(item){item.classList.toggle('active',item===nav)});show(nav.getAttribute('data-view')+' selected in the review snapshot.');return}var action=target.closest('[data-action]');if(!action)return;if(action.getAttribute('data-action')==='focus-search'){search.focus();document.querySelector('#workspace').scrollIntoView({behavior:'smooth',block:'start'})}if(action.getAttribute('data-action')==='inspect'){show('Opened read-only relationship review for '+action.getAttribute('data-target')+'.')}});
  document.addEventListener('keydown',function(event){if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus()}});
}());
