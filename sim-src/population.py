import math
from helper_functions import *

class population():

    def __init__(self, initial_pop, mean, stddev):
        self.initial = initial_pop
        self.population = NCurve(initial_pop, mean, stddev)
        self.dependencies = []
        self.predaDeck = 0
        #predaDeck is predatory decrement and is calculated based on the zscore of it's predators


    def dependencies_calc(self):
        #returns how well a certain populations has done based on the score of it's dependencies
        #print(self.dependencies)

        final = 0 #value to be returned
        
        dp_type_score = []
        importance = []

        for dependencyType in self.dependencies:            
            score = 0 #how well each dependecy is satisfied

            for dependency in dependencyType[0]: # the first item is a list of each...
                #dependency that supplies for that type, the second is the importance

                #how well each dependency source supplies that dependency

                score += dependency[0].population.Zscore() * dependency[1]

                dependency[0].predaDeck += self.population.Zscore() * dependency[1] * self.population.stddev
                # adds the success of this population to the predaDeck of the dependency source...
                # since the source should do badly if it's predators are doing well

                #print(dependency[0].population.Zscore() , dependency[1])

            importance.append(dependencyType[1])

            #print(score, dependencyType[1])

            dp_type_score.append(score)

        for i in range(len(dp_type_score)):
            final += dp_type_score[i] * importance[i]

        #print(dp_type_score)
        #print(importance)
        return final

    def increment(self):
        # this function is the heart of the simulation, it is called on every population in every run instance
        # it is called in the run method of environment

        pop = self.population.num
        #^ variable is created to store the previose population number
        # so that it can be used by the rest of the simulation

        self.population.num += math.floor((self.dependencies_calc() / 150) * self.population.stddev * mapped_number())
        # ^ adding the success of dependencies to the population
        self.population.num -= math.floor((self.predaDeck / 20) * mapped_number())
        # ^ reducing population by the success of predators
        self.predaDeck = 0
        # ^ resseting the score for success of the predators

        # returning previose population number to stay consistent 
        return pop

    def print(self, name = None):
        if name != None:
            print(name, ":")
        print("dependecies:", self.dependencies)
        print("mean:", self.population.mean, "number:", self.population.num,"standard dev:", self.population.stddev)
