var panStart;

var memoizedMoveScreen = memoize(function(mouse, gameState){
  if (!gameState.world || !gameState.world.center){
    gameState = copyWith(gameState, {
      world: { center: { x: 0, y: 0 } }
    });
  }

  if (mouse.button === 'right'){
    if (!panStart){
      panStart = {
        mouse,
        center: gameState.world.center
      };
    } else {
      const dx = panStart.mouse.x - mouse.x,
            dy = panStart.mouse.y - mouse.y;
      if (dx !== 0 && dy !== 0){
        gameState = copyWith(gameState, {
          world: { center: {
            x: panStart.center.x + dx,
            y: panStart.center.y + dy
          }}
        });
      }
    }
  } else if (panStart){
    panStart = null;
  }

  return gameState;
});

module.exports = function moveScreen(input, gameState){
  return memoizedMoveScreen(input.mouse, gameState);
};
