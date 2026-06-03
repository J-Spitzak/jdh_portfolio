JSFILES =\
	sim-src/main.js 
ALL = \
	index

all: $(ALL)

clean:
	$(RM) js/main.js

index: $(JSFILES)
	../jdh/bs/bs.py -i ../jdh/base sim-src/main.js > js/main.js 
	open ./index.html