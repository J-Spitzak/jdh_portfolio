import random

def mapped_number(accuracy = 100):

    number = random.randint(0, accuracy) / accuracy
    number += .5
    return number

class NCurve():

    def __init__(self, number = None, mean = None, standard_deviation = None, zScore = None):
        self.num = number
        self.zScore = zScore
        self.mean = mean
        self.stddev = standard_deviation

    def Zscore(self):
        return (self.num - self.mean) / self.stddev 
