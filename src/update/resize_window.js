var oldWindow;

var memoizedResizeWindow = memoize(function (window, gameState){
  return copyWith(gameState, {
    windowSize: window
  });
});

module.exports = function resizeWindow(input, gameState){
  return memoizedResizeWindow(input.window, gameState);
};
