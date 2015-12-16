var panStart;

var memoizedMoveScreen = memoize(function(mouse, gameState){
  if (!gameState.world || !gameState.world.center){
    gameState = copyWith(gameState, {
      world: {
        scale: 32,
        center: { x: 0, y: 0 }
      }
    });
  }

  if (mouse.scrollY){
    var scale = gameState.world.scale,
        newScale = Math.min(100, Math.max(20,
          scale - mouse.scrollY / scale
        ));
    if (newScale !== scale) {
      gameState = copyWith(gameState, {
        world: {
          scale: newScale
        }
      });
    }
  }

  if (mouse.button === 'right'){
    if (!panStart){
      panStart = {
        mouse,
        center: gameState.world.center
      };
    } else {
      const centerX = (panStart.mouse.x - mouse.x) / gameState.world.scale + panStart.center.x,
            centerY = (panStart.mouse.y - mouse.y) / gameState.world.scale + panStart.center.y;
      if (
        centerX !== gameState.world.center.x ||
        centerY !== gameState.world.center.y
      ){
        gameState = copyWith(gameState, {
          world: { center: {
            x: centerX,
            y: centerY
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
