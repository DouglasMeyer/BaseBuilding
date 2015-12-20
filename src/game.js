require('./globals');
var input = require('./input'),
    Output = require('./output'),
    output = new Output(),
    tick = require('./tick'),
    update = require('./update'),
    setUpdateState = require('./actions').setUpdateState,
    gameState = {},

    game = {
      run: function(){
        setUpdateState(function(fn){
          gameState = fn(gameState) || gameState;
        });
        tick(function gameTick(timeDelta){
          gameState = update(
            timeDelta,
            input.get(),
            gameState
          );
          output.render(gameState);
        });
      }
    };

if (typeof window !== 'undefined'){
  window.game = game;
  game.run();
}
module.exports = game;
