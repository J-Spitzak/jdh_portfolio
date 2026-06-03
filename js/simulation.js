
//BSInclude JDH.js

//BSInclude frame.js

//BSInclude button.js

//BSInclude boxButton.js

//BSInclude textInput.js

//BSInclude valueInput.js


//BSInclude xyPlot.js








// (helper functions.js)

function mapped_number() {
    // creates a random number beetween 0 and 1
    var num = Math.random();

    //makes the range of the number beetween .5 and 1.5
    num += .5;

    // the return value is multiplied by a number to create random variation
    return num;
}


class NCurve {
    constructor(num = null, 
        mean = null, 
        stddev = null, 
        zScore = null) {

            this.num = num;
            this.mean = mean;
            this.stddev = stddev;
            if (zScore != null){
                this.zScore = zScore;
            }
            else {
                this.zScore = this.Zscore;
            }

        }

    get Zscore() {
        return (this.num - this.mean) / this.stddev;
    }

    get StdDev() {
        return (this.num - this.mean) / this.zScore;
    }
  }
  





// (population.js)

class population {


    initial; // initial value of the population

    population_curve; // stores the normalized curve instance that hholds the data for the population

    dependencies; // a list of other populations it depends on

    predatory_decrement; // how impacted the population is by it's predators 

    data = []; // a list of the population number for every instance of the run function

    constructor(initial_pop, mean, stddev){

        this.initial = initial_pop;

        this.population_curve = new NCurve(initial_pop, mean, stddev);

        this.dependencies = [];

        this.predatory_decrement = 0;

        this.data.push(initial_pop);

    }


    dependencies_calc(){


        var final = 0; //value to be returned
        // returns how well a certain population has done based
        // on the success of it's dependencies

        var dp_type_scores = []; // the values stored from each type of dependency

        var importance = []; // the importance of each dependency type

        //console.log(this.dependencies);



        for (var dp_type_num = 0;  dp_type_num < this.dependencies.length; dp_type_num++){

            var dependencyType = this.dependencies[dp_type_num];


            var score = 0; // how well the population is doing for each dependency type


            for (var dependency_num = 0; dependency_num < dependencyType[0].length ; dependency_num++){
                // the first item  in dependencyType is a list of each...
                // dependency that supplies for that type, the second is the importance

                


                var dependency = dependencyType[0][dependency_num][0];
                var dependency_importance = dependencyType[0][dependency_num][1];


                

                // how well each dependency source supplies that dependency
                score += dependency.population_curve.zScore * dependency_importance;
                // how well a population is doing ^ * it's importance ^
                

                dependency.predatory_decrement += this.population_curve.Zscore * dependency_importance * this.population_curve.stddev;
                // adds the success of this population to the predatory_decrement of the dependency source...
                // since the source should do badly if it's predators are doing well

            }

            importance.push(dependencyType[1]); // appends the importance of each dependency type to the "importances" list

            dp_type_scores.push(score); // appends the score which was stored in the score variable and modified ...
            // by the giant for block
        }

        for (var i = 0; i < dp_type_scores.length;i++){
            final += dp_type_scores[i] * importance[i];
        }
        return final;
    }

    increment(){
        //this function is the heart of the simulation, it is called on every population in every run instance
        // it is called in the run method of environment

        var pop = this.population_curve.num;
        //^ variable is created to store the previose population number
        // so that it can be used by the rest of the simulation

        this.population_curve.num += Math.floor((this.dependencies_calc() / 150) * this.population_curve.stddev * mapped_number());
        // ^ adding the success of dependencies to the population

        this.population_curve.num -= Math.floor((this.predatory_decrement / 20) * mapped_number());
        // ^ reducing population by the success of predators

        this.predatory_decrement = 0;
        // ^ resseting the score for success of the predators

        // returning previose population number to stay consistent 

        this.data.push(this.population_curve.num);

        return pop;
    }

    print(name = null){
        if (name != null){
            console.log(name, ":");
        }

        console.log("mean ", this.population_curve.mean, "number: ", this.population_curve.num, "standard dev: ", this.population_curve.stddev, "\n");
    }

};









//environment.js

class environment {

    populations = {};

    env_data = {};

    stop;

    runtimes = 0;

    printPop(){
        console.log("this.populations: \n")
        console.log(this.populations);

        for (let key in this.populations) {
            console.log("key = " + key);
            console.log(" \n(this.populations)[key] \n")
            console.log(this.populations[key]);
            console.log(this.populations[key], " = ", this.populations[key].print());            
        }
    }

    pop_setup(){
        this.populations["birds"] = new population(500, 450, 100);
        this.populations["worms"] = new population(2500, 3000, 400);
        this.populations["birds"].dependencies = [[[[this.populations["worms"],1]],1]];

        //this function is no longer called, the  "setup" function in this class is currently what is run...
        //and sets up the populations based on user input
    }

    run(){


        this.runtimes++
        if (this.stop == undefined){
            return;
        }

        var iteration = 0;


        for (const population in this.populations) {
            this.env_data[population] = [];
        }

        var plz_break = false;
  

        while(true){




            var New = this.populations;
            // ^ creating new copy of population values to store new values...
            // isolated from old ones that the simulation is running on

            var extinct = [];

            for (const population in New) {

                New[population].increment();

                //console.log(`${population}: ${New[population].population_curve.num}`);
                
                if (New[population].population_curve.num <= 0){
                    extinct.push(population);
                }

                this.env_data[population] = this.populations[population].data;
            }

            iteration++;


            if (iteration >= this.stop){
                plz_break = true;
            }

            for (const extinct_index in extinct){
                var ex = extinct[extinct_index];
                delete New[ex];
                plz_break = true;
            }
            this.populations = New;
            

            if (plz_break){
                return;
            }            
        }


        /* for (const population in this.populations) {
            this.env_data[population] = this.populations[population].data;
        } */
    }
}



// (simulation.js)

env = new environment();
env.pop_setup();
env.run();







//My code (main.js)








//// setting up jdh  ///////////////////////
testDrawing = new JDHDrawing( "testDraw" );
bg = new Frame( 0, 0, 1, 1 );
bg.setCombinedPaint( rgba(247, 6, 6, 1) );
testDrawing.add( bg );
////////////////////////////////////////////
//// setting up frames  ////////////////////
/*
menuHeight = .1
TopMenu = new Frame( 0, 0, 1, menuHeight );
MainFrame = new Frame( 0, menuHeight, 1, 1 );
bg.add( TopMenu );
bg.add( MainFrame );
*/
////////////////////////////////////////////
//MainScroll = new ScrollArea(0,0,1,1);
//MainScroll.setArea( 100, 1000 );
//bg.add(MainScroll);


rect1 = new Rectangle(0,0,50,300);
rect1.setLineWidth(10);
bg.add(rect1);




//// input fields   /////////////////////////////////////
/////////////////////////////////////////////////////////



resize();