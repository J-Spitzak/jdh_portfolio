import time
from population import *



class environment():

    def __init__(self):
        self.populations = {}
    
    def printPop(self):
        print(self.populations)
        for i in self.populations.keys():
            print(i, "=", self.populations[i].print( ))  


    def setup(self):

        print("population number: ")

        populationsNum = int(input())
        for _ in range(populationsNum):
            print(_, "nth population: name, number, mean, standard deviation")
            nm = str(input())
            #name ^
            self.populations[nm] = population(int(input()),int(input()),int(input()))
            print(nm, "-- number:", self.populations[nm].population.num, "mean:", self.populations[nm].population.mean, "standard dev:", self.populations[nm].population.stddev)
        
        print("dependencies: ")

        key_list = list(self.populations.keys())
        val_list = list(self.populations.values())

        for i in key_list:
            pop = self.populations[i]
            print("number of elements for:", i)
            elementNum = int(input())
            listing = []
            for element in range(elementNum):
                print("element importance: ")
                imp = int(input())
                newListing = [[],imp]
                print("number of suppliers:")
                supplierNum = int(input())
                for supplier in range(supplierNum):
                    print("supplier importance, name:")
                    supplierImp = int(input())
                    supplierName = str(input())
                    newListing[0].append([self.populations[supplierName], supplierImp])
                listing.append(newListing)
                pop.dependencies = listing

        
        print("setup done!")
        self.printPop()
        def timedown(n):
            print("running in", n)
            time.sleep(1)
        timedown(3)
        timedown(2)
        timedown(1)
        print("starting")



    def pop_setup(self):
        self.populations["birds"] = population(500, 450, 100)
        self.populations["worms"] = population(2500, 3000, 400)
        self.populations["birds"].dependencies = [[[[self.populations["worms"],5]],5]]
        self.printPop()
        #this function is no longer called, the  "setup" function in this class is currently what is run...
        #and sets up the populations based on user input
    
    def run(self):
        while True:

            new = self.populations
            # ^ creating new copy of population values to store new values...
            # isolated from old ones that the simulation is running on

            extinct = [] # list for extinct species

            for population in new:
                new[population].increment()
                print(population,  ": " , new[population].population.num)
                if new[population].population.num <= 0:
                    print(population, "went extinct")
                    extinct.append(population)

            for ex in extinct:
                new.pop(ex)

            self.populations = new
            time.sleep(1)
                
