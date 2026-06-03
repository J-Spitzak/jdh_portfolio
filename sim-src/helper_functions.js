

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
  
