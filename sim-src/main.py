import sys

from helper_functions import *
from environment import *

            


"""
test for dependencies calc method
birds = population(500, 400, 50)
birds.dependencies = [[[[population(10,20,2), 5], [population(120,100,30),2]],5],[[[population(15,20,5),2], [population(500,300,150),3]],5]]
#            specific population ^ importance ^        importance of resource ^   all populations that contribute to resource end here ^
print(birds.dependencies_calc())
"""


'''env.pop_setup() # the pre-setup one
env.setup() #the one where you set it up'''


if __name__ == '__main__': 
        
    env = environment()

    arguments = sys.argv

    if ':p' in arguments or ':c' in arguments:
        if ':p' in arguments:
            env.pop_setup()
        if ':c' in arguments:
            env.setup()
    else:
        try:
            print(arguments[1], "is not a valid argument")
        except:
            print("an argument must be provided")

        print("possible arguments are: \n :p -> stands for 'pre' uses pre-made test setup \n :c -> stands for 'custom' uses command line utility to create a custom environment")
        input()
        quit()


    env.run()