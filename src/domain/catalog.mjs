export const sites = [
  {id:'capital', name:'San Salvador de Jujuy', region:'Valles', lat:-24.1858, lon:-65.2995, darkness:.18},
  {id:'tilcara', name:'Tilcara', region:'Quebrada', lat:-23.5772, lon:-65.3933, darkness:.59},
  {id:'purmamarca', name:'Purmamarca', region:'Quebrada', lat:-23.7464, lon:-65.498, darkness:.65},
  {id:'susques', name:'Susques', region:'Puna', lat:-23.397, lon:-66.367, darkness:.78},
  {id:'salinas', name:'Salinas Grandes', region:'Puna', lat:-23.618, lon:-65.966, darkness:.89},
];

export const experiences = [
  {id:'luna-urbana', site:'capital', title:'La Luna desde la ciudad', kind:'Observación familiar', provider:'Guía ficticio A', duration:75, capacity:6, price:18000, description:'Una introducción a mares y cráteres con observación guiada y actividades para familias.', requirements:'Menores acompañados. Abrigo.', cancellation:'Reprogramación simulada por nubes.', safety:'Punto de encuentro urbano por confirmar.'},
  {id:'foto-quebrada', site:'tilcara', title:'Fotografía de cielo en la Quebrada', kind:'Taller de astrofotografía', provider:'Estudio ficticio B', duration:150, capacity:4, price:45000, description:'Aprendé a enfocar de noche, exponer el cielo y componer con el paisaje.', requirements:'Cámara con modo manual, trípode y abrigo.', cancellation:'Reprogramación simulada por nubes o viento.', safety:'Lugar y acceso nocturno sujetos a validación.'},
  {id:'planetas-puna', site:'susques', title:'Planetas de la Puna', kind:'Observación guiada', provider:'Operador ficticio C', duration:120, capacity:8, price:32000, description:'Una sesión de telescopio centrada en los planetas visibles durante la noche elegida.', requirements:'Abrigo. Evaluación previa de traslado y altura.', cancellation:'Reprogramación simulada por mal tiempo.', safety:'Permisos, altura y traslado sujetos a validación.'},
];
