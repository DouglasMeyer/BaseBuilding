var selectStart;

var memoizedToggleTile = memoize(function(mouse, gameState){
  if (mouse.button === 'left'){
    if (!selectStart){
      selectStart = mouse;
    }
  } else if (selectStart){
    const x = Math.floor((selectStart.x + gameState.world.center.x - gameState.windowSize.width / 2) / 32),
          y = Math.floor((selectStart.y + gameState.world.center.y - gameState.windowSize.height / 2) / 32),
          tiles = gameState.world.tiles;
    selectStart = null;

    return copyWith(gameState, {
      world: {
        tiles: tiles.substitute(y,
          tiles[y].substitute(x, copyWith(tiles[y][x], {
            type: tiles[y][x].type === 'empty' ? 'floor' : 'empty'
          }))
        )
      }
    });
  }
});

module.exports = function toggleTile(input, gameState){
  return memoizedToggleTile(input.mouse, gameState);
};
