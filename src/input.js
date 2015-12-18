var mouse = {},
    window = {};

function onMouseDown(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    button: e.button === 0 ? 'left' : 'right'
  });
  return false;
}
function onMouseUp(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    button: undefined
  });
}
function onMouseMove(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    x: e.x,
    y: e.y
  });
}
function onScroll(e){
  mouse = copyWith(mouse, {
    scrollX: e.deltaX,
    scrollY: e.deltaY
  })
}
function onResize(e){
  window = {
    width:  document.body.clientWidth,
    height: document.body.clientHeight
  };
}
document.body.addEventListener('mousemove', onMouseMove);
document.body.addEventListener('mousedown', onMouseDown);
document.body.addEventListener('mouseup',   onMouseUp);
addEventListener('mousewheel', onScroll); //FIXME: should this be 'wheel'?
addEventListener('contextmenu', function(e){ e.preventDefault(); });
addEventListener('resize', onResize);
addEventListener('mousedown', function(e){
  this.focus();
});

onResize();

module.exports.get = function inputGet(){
  return {
    mouse: mouse,
    window: window
  };
};
