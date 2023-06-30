const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

const engine = Engine.create();
engine.world.gravity.y = 0; // disable the gravity
const { world } = engine; // world is a snapshot of all the engines we have
const width = window.innerWidth; // declare here and use in function for changing later
const height = window.innerHeight - 5;
// const cellsHorizontal = 12;
// const cellsVertical = 10;

// const cells = 8;
const wallWidth = 8;
const velocity = 5;

// show content on the screen
const render = Render.create({
  // render object
  // Tell the render where to show element in html
  element: document.body,
  engine: engine,
  options: {
    // width and height of the canvas gonna be used
    width,
    height,
    wireframes: true, // ==false => solidify the shapes, and their color are randomly
  },
});
Render.run(render);
Runner.run(Runner.create(), engine);

//Game Map Boundaries
const walls = [
  Bodies.rectangle(width / 2, 0, width, 2, { isStatic: true }), // top border
  Bodies.rectangle(0, height / 2, 2, height, { isStatic: true }), // left border
  Bodies.rectangle(width, height / 2, 2, height, { isStatic: true }), // right border
  Bodies.rectangle(width / 2, height, width, 2, { isStatic: true }), // bottom
];

World.add(world, walls); // can pass an array of shapes

// Generate randoom shapes onto the screen
// for (let i=0; i<0; i++){
//     const randX = Math.floor(Math.random() * 700) + 50; // 50 -> 749
//     const randY = Math.floor(Math.random() * 500) + 50; // 50 -> 550
//     if (Math.random() > .5){
//         World.add(world, Bodies.rectangle(randX, randY, 50,50));
//     }
//     else{
//         World.add(world, Bodies.circle(randX, randY, 30, { // here is an obj for styling and optimize shape
//             render:{ // customize how the circle should be rendered onto the screen
//                 fillStyle: 'red' // css color value
//             }
//         }));

//     }

// }

class Game {
  constructor(levelText, timeText, backBtn, resultPanel, callbacks) {
    this.levelText = levelText;
    this.timeText = timeText;
    this.backBtn = backBtn;
    this.resultPanel = resultPanel;
    this.nextBtn = resultPanel.querySelector(".result_next");

    if (callbacks) {
      this.onStart = callbacks.onStart;
      this.onTick = callbacks.onTick;
      this.onComplete = callbacks.onComplete;
    }
    this.backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
    this.start();
    // this.tick();
    // WIN DETECTION: There is only 1 single event obj matter js owns, means that every time it occurs->
    // matter js changes some values inside it and after calling callbacks, they are wiped ou
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((collision) => {
        //collision holds two objected collied A and B
        const labels = ["goalLabel", "playerLabel"];
        if (
          labels.includes(collision.bodyA.label) &&
          labels.includes(collision.bodyB.label)
        ) {
          // Making Winning animation: making all the maze walls fall apart
          World.remove(world, collision.bodyA);
          World.remove(world, collision.bodyB);
          world.gravity.y = 1;
          // Remove gravity of all objects on the screen
          world.bodies.forEach((body) => {
            if (body.label === "wall") {
              // Body update the static flag on in obj
              Body.setStatic(body, false);
            }
          });
          this.onFinished();
        }
      });
    });

    this.nextBtn.addEventListener("click", () => {
      const wallArr = [];
      resultPanel.classList.add("d-none");
      world.bodies.forEach((body) => {
        if (
          body.label === "wall" ||
          body.label === "playerLabel" ||
          body.label === "goalLabel"
        ) {
          wallArr.push(body);
        }
      });
      wallArr.forEach((el) => {
        World.remove(world, el);
      });
      // Is Finished
      if (this.isCompleted) {
        this.start();
      } else {
        this.level = 0;
        this.start();
      }
    });
  }

  // get timeRemaining() {
  //   if (this.timeRemaining) return 0;
  //   return this.timeRemaining;
  // };
  // set timeRemaining(time){

  // };

  start = () => {
    this.keypressed = false;
    this.isCompleted = false;
    if (!this.level) {
      this.level = 1;
      this.cellsHorizontal = 4;
      this.cellsVertical = 3;
    } else {
      this.cellsHorizontal = Math.floor(this.cellsHorizontal * 1.5);
      this.cellsVertical = Math.floor(this.cellsVertical * 1.5);
    }
    // this.timeRemaining = Math.pow(this.level - 2, 3) + 10;
    this.timeRemaining = 5 * Math.floor(Math.pow(1.8, this.level - 1));
    this.resetMap(this.cellsHorizontal, this.cellsVertical);
    this.updateIngameMenu();
    this.interval = setInterval(this.tick, 1000);
  };

  resetMap = (cellsHorizontal, cellsVertical) => {
    world.gravity.y = 0;
    const unitLengthX = width / cellsHorizontal;
    const unitLengthY = height / cellsVertical;
    // MAZE GENERATION -------------------------------
    const shuffle = (arr) => {
      // function to shuffle an array's values
      let i = arr.length;
      while (i > 0) {
        const index = Math.floor(Math.random() * i); // to get a random arr value
        i--;
        // swap the current value with random
        let temp = arr[i];
        arr[i] = arr[index];
        arr[index] = temp;
      }
      return arr;
    };

    const grid = Array(cellsVertical) // vertically
      .fill(null)
      .map(() => Array(cellsHorizontal).fill(false)); // horizontally, map loops through element into arr
    // return an arr of cells values filled with false into an el

    // Array storing all cells in the game: Check the drawing in markdown
    // Verticals walls: [[F,F], [F,F], [F,F]]
    const verticals = Array(cellsVertical)
      .fill(null)
      .map(() => Array(cellsHorizontal - 1).fill(false));
    // Horizontal walls: [[F,F,F], [ F,F,F]]
    const horizontals = Array(cellsVertical - 1)
      .fill(null)
      .map(() => Array(cellsHorizontal).fill(false));

    console.log(grid);

    const startRow = Math.floor(Math.random() * cellsVertical);
    const startCol = Math.floor(Math.random() * cellsHorizontal);

    const stepThroughCell = (row, col) => {
      // If the cell is visited -> return
      if (grid[row][col]) return;
      // Mark this cell as visited
      grid[row][col] = true;
      // Assemble randomly-ordered list of walls
      const neighbors = shuffle([
        // make a random maze
        [row - 1, col, "up"],
        [row, col + 1, "right"],
        [row + 1, col, "down"],
        [row, col - 1, "left"],
      ]);
      // For each neighbor (neighbors are the adjacent cells)
      for (let neighbor of neighbors) {
        const [nextRow, nextCol, direction] = neighbor; // destructure from neighbor [.,.]
        // Check out of bound
        if (
          nextRow < 0 ||
          nextRow >= cellsVertical ||
          nextCol < 0 ||
          nextCol >= cellsHorizontal
        ) {
          continue; // continue the loop without existing
        }
        // Check visited
        if (grid[nextRow][nextCol]) continue;

        // Remove wall for movable cell(set to true)
        if (direction === "up") {
          horizontals[row - 1][col] = true;
        } else if (direction === "right") {
          verticals[row][col] = true; // stay the exact position as current cell
        } else if (direction === "down") {
          horizontals[row][col] = true;
        } else if (direction === "left") {
          verticals[row][col - 1] = true; // use row,col of the current position
        }
        // IDEA: is to travel through every cell of the maze, starting from 1 point and randomly
        // moving to neighbors around until there is no unvisited cell left
        stepThroughCell(nextRow, nextCol);
      }
      //visit the next cell
    };
    stepThroughCell(startRow, startCol);

    // GENERATE Maze walls
    horizontals.forEach((row, rid) => {
      // Generating horizontal walls
      row.forEach((open, cid) => {
        if (open) return; // no wall-> no drawing anything
        const x = cid * unitLengthX + unitLengthX / 2; // x related to columm index
        const y = (rid + 1) * unitLengthY;
        const wall = Bodies.rectangle(x, y, unitLengthX, wallWidth, {
          isStatic: true,
          label: "wall",
          render: {
            fillStyle: "red",
          },
        });
        World.add(world, wall);
      });
    });

    verticals.forEach((row, rid) => {
      row.forEach((open, cid) => {
        if (open) return; // no wall-> no drawing anything
        const y = rid * unitLengthY + unitLengthY / 2;
        const x = (cid + 1) * unitLengthX;
        const wall = Bodies.rectangle(x, y, wallWidth, unitLengthY, {
          isStatic: true,
          label: "wall",
        });
        World.add(world, wall);
      });
    });

    // GAME UNITS ---------------------
    const goal = Bodies.rectangle(
      width - unitLengthX / 2,
      height - unitLengthY / 2,
      Math.min(unitLengthX / 2, unitLengthY / 2) * 0.8,
      Math.min(unitLengthX / 2, unitLengthY / 2) * 0.8,
      {
        isStatic: true,
        label: "goalLabel",
      }
    );
    const player = Bodies.circle(
      unitLengthX / 2,
      unitLengthY / 2,
      Math.min(unitLengthX / 2, unitLengthY / 2) * 0.5,
      {
        isStatic: false,
        label: "playerLabel",
        render: {
          fillStyle: "blue",
        },
      }
    );
    World.add(world, goal);
    World.add(world, player);
    // CONTROLLER ---------------------------
    // Moved by steps
    this.keypressed = false;
    this.keyCode = (event) => {
      // Get player, dont know why it doesnt count const player
      let player;
      world.bodies.forEach((body) => {
        if (body.label === "playerLabel") {
          player = body;
        }
      });
      const { x, y } = player.velocity; // Body obj
      if (!this.keypressed && [87, 83, 65, 68].includes(event.keyCode)) {
        if (event.keyCode === 87) {
          //W
          // Move up -> y < 0
          // Body.setVelocity(player, { x: 100, y: 100 });
          Body.setVelocity(player, { x, y: y - velocity }); // destructuring obj
        }
        if (event.keyCode === 83) {
          //S
          Body.setVelocity(player, { x, y: y + velocity });
        }
        if (event.keyCode === 65) {
          //A
          Body.setVelocity(player, { x: x - velocity, y });
        }
        if (event.keyCode === 68) {
          //D
          Body.setVelocity(player, { x: x + velocity, y });
        }
        this.keypressed = true;
      }
    };

    document.addEventListener("keydown", this.keyCode);
    document.addEventListener("keyup", (event) => {
      // if (this.keypressed && [87, 83, 65, 68].includes(event.keyCode)) {
      // }
      this.keypressed = false;
    });
  };

  updatePanel = (isCompleted) => {
    resultPanel.classList.remove("d-none");
    const panelTitle = resultPanel.querySelector("h3");
    const panelLevel = resultPanel.querySelector("p");
    const menuBtn = resultPanel.querySelector(".result_back");

    if (isCompleted) {
      panelTitle.innerText = "Level Completed!";
      panelLevel.innerText = `Next Level: ${this.level}`;
      this.nextBtn.innerText = "Next Level";
    } else {
      panelTitle.innerText = "Time Out!";
      panelLevel.innerText = `Max level: ${this.level}`;
      this.nextBtn.innerText = "Play Again";
    }
  };

  updateIngameMenu = () => {
    levelText.innerText = `Level: ${this.level}`;
    timeText.innerText = `Time left: ${this.timeRemaining}`;
  };

  tick = () => {
    this.updateIngameMenu();
    if (this.timeRemaining > 0) this.timeRemaining -= 1;
    else {
      this.onFailed();
    }
  };
  onFinished = () => {
    this.level++;
    this.isCompleted = true;
    this.onEnd();
  };
  onFailed = () => {
    this.onEnd();
    // document.removeEventListener("keydown", this.keyCode);
    world.bodies.forEach((body) => {
      if (body.label === "playerLabel") {
        body.isStatic = true;
      }
    });
  };
  onEnd = () => {
    clearInterval(this.interval);
    this.updatePanel(this.isCompleted);
  };
}

// Put this in a specific js files later on

const levelText = document.querySelector(".gamebar_level");
const timeText = document.querySelector(".gamebar_time");
const backBtn = document.querySelector(".game_back");
const resultPanel = document.querySelector(".result_bg");

const newGame = new Game(levelText, timeText, backBtn, resultPanel, {
  // callbacks here function here
  onStart() {},
  onTick() {},
  onComplete() {},
});
