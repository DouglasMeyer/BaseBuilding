var changeState = require('./update/change_state'),
    resizeWindow = require('./update/resize_window'),
    loadTextures = require('./update/load_textures'),
    moveScreen = require('./update/move_screen'),
    toggleTile = require('./update/toggle_tile'),
    processActions = require('./update/process_actions');

module.exports = function update(timeDelta, input, gameState){
  return [
    processActions,
    changeState.bind(null, input),
    loadTextures,
    resizeWindow.bind(null, input),
    moveScreen.bind(null, input),
    toggleTile.bind(null, input),
  ].reduce(function updateReduceChanges(gameState, f){ return f(gameState) || gameState; }, gameState);
};
