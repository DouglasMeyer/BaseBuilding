var changeState = require('./update/change_state'),
    resizeWindow = require('./update/resize_window'),
    loadTextures = require('./update/load_textures'),
    moveScreen = require('./update/move_screen'),
    toggleTile = require('./update/toggle_tile')

module.exports = function update(timeDelta, input, gameState){
  return [
    changeState.bind(null, input),
    loadTextures,
    resizeWindow.bind(null, input),
    moveScreen.bind(null, input),
    toggleTile.bind(null, input),
  ].reduce(function updateReduceChanges(gameState, f){ return f(gameState) || gameState; }, gameState);
};
