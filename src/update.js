var changeState = require('./update/change_state'),
    resizeWindow = require('./update/resize_window'),
    loadTextures = require('./update/load_textures'),
    moveScreen = require('./update/move_screen'),
    toggleTile = require('./update/toggle_tile')

module.exports = function update(timeDelta, input, gameState){
  return [
    changeState.bind(null, input),
    resizeWindow.bind(null, input),
    moveScreen.bind(null, input),
    toggleTile.bind(null, input),
    function generateTiles(gameState){
      if (gameState.world.tiles) return;

      var newGameState = copyWith(gameState, {
        world: {
          tiles: [],
        }
      });
      for (var y=0;y<100;y++){
        var row = [];
        newGameState.world.tiles.push(row);
        for (var x=0;x<100;x++){
          row.push({
            type: Math.random() > 0.5 ? 'empty' : 'floor',
            looseObject: null,
            installedObject: null,
            x: x,
            y: y
          });
        }
      }
      return newGameState;
    },
    loadTextures,
  ].reduce(function updateReduceChanges(gameState, f){ return f(gameState) || gameState; }, gameState);
};
