
REPORTER = dot

test:
	@./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--slow 500ms \
		--bail

.PHONY: test
