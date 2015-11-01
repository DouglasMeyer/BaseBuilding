var callback, lastTime;

function onTick(time){
  requestAnimationFrame(onTick);
  if (!window.pause) callback(time - lastTime);
  lastTime = time;
}

module.exports = function initTick(cb){
  if (callback) throw "tick called more than once!"
  requestAnimationFrame(onTick);
  callback = cb;
  lastTime = performance.now();
};
