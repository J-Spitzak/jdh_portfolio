JSFILES =\
	sim-src/environment.js \
	sim-src/helper_functions.js \
	sim-src/main.js \
	sim-src/population.js \
	sim-src/simulation.js

ALL = \
	index

all: $(ALL)

clean:
	$(RM) js/simulation.js js/main.js js/nodeSim.js

index: $(JSFILES)
	../jdh/bs/bs.py -i ./sim-src sim-src/main.js > js/simulation.js
	../jdh/bs/bs.py -i ../jdh/base js/simulation.js > js/main.js 
	open ./index.html