function mouseToCoords(mouse, gameState){
  const scale = gameState.world.scale;
  return {
    x: Math.floor(mouse.x / scale + gameState.world.center.x - gameState.windowSize.width / 2 / scale),
    y: Math.floor(mouse.y / scale + gameState.world.center.y - gameState.windowSize.height / 2 / scale)
  }
}

var memoizedToggleTile = memoize(function(mouse, gameState){
  if (mouse.button === 'left'){
    const coords = mouseToCoords(mouse, gameState);
    if (!gameState.world.selection){
      return copyWith(gameState, {
        world: {
          selection: {
            start: coords,
            end: coords
          }
        }
      });
    } else {
      return copyWith(gameState, {
        world: {
          selection: {
            end: coords
          }
        }
      });
    }
  } else if (gameState.world.selection){
    const tiles = gameState.world.tiles,
          start = gameState.world.selection.start,
          end = gameState.world.selection.end,
          newTiles = tiles.substitute(start.y, end.y, function(rows){
            var tileType;
            return rows.map(function(row){
              return row.substitute(start.x, end.x, function(tiles){
                return tiles.map(function(tile){
                  if (!tileType) tileType = tile.type === 'empty' ? 'floor' : 'empty';
                  if (tile.type !== tileType) {
                    return copyWith(tile, { type: tileType });
                  } else {
                    return tile;
                  }
                });
              });
            });
          });

    return copyWith(gameState, {
      world: {
        selection: undefined,
        tiles: newTiles
      }
    });
  }
});

module.exports = function toggleTile(input, gameState){
  return memoizedToggleTile(input.mouse, gameState);
};
