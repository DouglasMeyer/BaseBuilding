require('./globals');
var input = require('./input'),
    Output = require('./output'),
    output = new Output(),
    tick = require('./tick'),
    update = require('./update'),
    gameState,

    game = {
      run: function(){
        tick(function gameTick(timeDelta){
          gameState = update(
            timeDelta,
            input.get(),
            gameState || {}
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
