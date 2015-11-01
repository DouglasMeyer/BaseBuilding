var actions = [],
    mouse = {},
    window = {},
    keyMappings = {
      'Up':    'Up',    'U+0057': 'Up',    // W
      'Left':  'Left',  'U+0041': 'Left',  // A
      'Down':  'Down',  'U+0053': 'Down',  // S
      'Right': 'Right', 'U+0044': 'Right'  // D
    };

function onKeyDown(e){
  var key = keyMappings[e.keyIdentifier];
  if (actions.indexOf(key) === -1)
    actions.push(key);
}
function onKeyUp(e){
  var key = keyMappings[e.keyIdentifier],
      index = actions.indexOf( key );
  if (index !== -1)
    actions.splice(index, 1);
}
function onMouseDown(e){
  e.preventDefault();
  mouse.button = e.button === 0 ? 'left' : 'right';
}
function onMouseUp(e){
  delete mouse.button;
}
function onMouseMove(e){
  e.preventDefault();
  mouse.x = e.x;
  mouse.y = e.y;
}
function onBlur(e){
  actions.splice(0, actions.length);
}
function onResize(e){
  window = {
    width:  document.body.clientWidth,
    height: document.body.clientHeight
  };
}
document.body.addEventListener('keydown',   onKeyDown);
document.body.addEventListener('keyup',     onKeyUp);
document.body.addEventListener('mousemove', onMouseMove);
document.body.addEventListener('mousedown', onMouseDown);
document.body.addEventListener('mouseup',   onMouseUp);
addEventListener('blur', onBlur);
addEventListener('resize', onResize);
addEventListener('mousedown', function(e){
  this.focus();
});

onResize();

module.exports.get = function inputGet(){
  return {
    actions: actions,
    mouse: mouse,
    window: window
  };
};
