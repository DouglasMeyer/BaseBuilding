var oldWindow;

module.exports = function resizeWindow(input, gameState){
  if (input.window === oldWindow) return;
  oldWindow = input.window;

  return copyWith(gameState, {
    windowSize: input.window
  });
};
