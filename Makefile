# Makefile

BASE = .

all: test

test:
	jshint $(BASE)/lib/

.PHONY: all test
