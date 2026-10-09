'use strict';
// Keep previously shared application deep links usable after adding the guide.
if(['overview','ledger','calendar','scenario','planner','octopus','report','wealth','integration','profile','setup'].includes(location.hash.slice(1))){location.replace('experience.html'+location.hash);}
