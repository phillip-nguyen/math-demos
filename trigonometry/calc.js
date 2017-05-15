// CALC.js module
// Copyright 2013 Phillip Nguyen.
// All rights reserved.
//
// The module exposes only one method called "parse",
// which takes an input string representing a mathematical expression
// such as "0.25sin(t-3) + 4"
// and returns a function which will evaluate the expression.
// The function has one parameter, the value to substitute in
// for the variable t.
CALC = (function() {
    "use strict";

    function lex(input) {
	var token_list = [];

	// The find_next_match function has <input> and <token_list> 
	// in scope, and modifies both if it finds a match.
	function find_next_match(type, pattern) {
	    var result = input.match(pattern); 
	    if (result === null) return false;
	    var tok = result[0];
	    if (type === "OPERATOR" || type === "PARENTHESES") {
		type = tok;
	    }
	    token_list.push({token: tok, type: type});
	    input = input.substr(tok.length);
	    return true;
	}
	
	while (input) {
	    // Remove leading whitespace
	    input = input.replace(/^\s+/, "");
	    if (input === "") break;
	    // Look for valid tokens.
	    if (find_next_match("NUMBER", /(^\d+(\.\d+)?)|(^\.\d+)/)) continue;
	    if (find_next_match("FUNCTION", /^(sin|cos|tan|csc|sec|cot|ln|exp|abs)/)) continue;
	    if (find_next_match("OPERATOR", /^(\+|-|\*|\/|\^)/)) continue;
	    if (find_next_match("PARENTHESES", /^(\(|\))/)) continue;
	    // Must look for constants and variables after functions, so that
	    // "exp" is found before "e", and "tan" is found before "t".
	    if (find_next_match("CONSTANT", /^(pi|e)/)) continue;
	    if (find_next_match("VARIABLE", /^t/)) continue;
	    // If nothing matched, then input was invalid and we return false.
	    throw {type: "LexicalError", msg: "Don't understand " + input};
	}
	return token_list;
    }


    // Parse function takes an input string and returns an equivalent
    // postfix expression stored as a sequence of tokens in an array.
    function parse(input) {
	var tokens = lex(input), token_index = 0;
	var curr_tok = tokens[0];
	var postfix = [];
	if (!tokens || tokens.length === 0) return false;

	// Returns the next token in the token stream.
	// Modifies the value of <token_index> declared above.
	// Returns false if we run out of tokens.
	function next_token() {
	    token_index += 1;
	    if (token_index >= tokens.length) return false;
	    return tokens[token_index];
	}

	// Tries to match the given token type with the 
	// current token in the token stream.  If there is a valid
	// match, then the current token is advanced to the next one,
	// otherwise we throw a syntax error.
	function match(tok) {
	    if (curr_tok.type === tok) {
		curr_tok = next_token();
	    } else {
		throw {type: "SyntaxError", msg: "Error matching" + tok};
	    }
	}

	// Checks if the current token type matches <tok>
	// but does not advance to the next token.
	function lookahead(tok) {
	    if (curr_tok.type === tok) return true;
	    return false;
	}

	function F() {
	    if (lookahead('(')) {
		match('('); E(); match(')');
	    } else if (lookahead("NUMBER")) {
		postfix.push(curr_tok);
		match("NUMBER");
	    } else if (lookahead("FUNCTION")) {
		var f = curr_tok;
		match("FUNCTION"); match('('); E(); match(')');
		postfix.push(f);
	    } else if (lookahead("CONSTANT")) {  
		postfix.push(curr_tok);
		match("CONSTANT");
	    } else if (lookahead("VARIABLE")) {  // 
		postfix.push(curr_tok);
		match("VARIABLE");
	    } else {
		throw {type: "SyntaxError", msg: "Error parsing F"};
	    }
	}

	function S() {
	    var neg = false;
	    if (lookahead('-')) {
		match('-');
		neg = true;
	    }
	    F();
	    if (lookahead('^')) {
		var p = curr_tok;
		match('^'); S();
		postfix.push(p);
	    }
	    if (neg) {
		postfix.push({token: '-', type: 'NEGATION'});
	    }
	}
	
	function T() {
	    S(); T_rest();
	}

	function T_rest() {
	    if (lookahead('*')) {
		var m = curr_tok;
		match('*'); S(); postfix.push(m); T_rest();
	    } else if (lookahead('/')) {
		var d = curr_tok;
		match('/'); S(); postfix.push(d); T_rest();		  
	    } else if (lookahead('NUMBER') || 
		       lookahead('CONSTANT') || 
		       lookahead('(') || 
		       lookahead('VARIABLE') || 
		       lookahead('FUNCTION')) {
		// Next expression is a factor.
		S(); postfix.push({token: "", type: '*'}); T_rest();
	    } else {
		// empty
	    }
	}

	function E() {
	    T(); E_rest();
	}

	function E_rest() {
	    if (lookahead('+')) {
		var a = curr_tok;
		match('+'); T(); postfix.push(a); E_rest();
	    } else if (lookahead('-')) {
		var s = curr_tok;
		match('-'); T(); postfix.push(s); E_rest();
	    } else {
		// empty
	    }
	}

	// Start parsing with the input as an expression E.
	E();

	// Return the contents of the postfix array if we
	// parsed the input successfully.
	return postfix;
    }


    // Add-ons to the included math functions.
    // Probably should have some checks in here for NaN results.
    function cosecant(x) { return 1/Math.sin(x); }
    function secant(x) { return 1/Math.cos(x); }
    function cotangent(x) { return 1/Math.tan(x); }

    
    // Given an expression represented as an array of tokens
    // in postfix format, such as what is returned by the "parse"
    // function above, evaluate the postfix expression using
    // a stack and replace any variable tokens with the passed
    // in <value>.
    function evaluate_postfix(postfix, value) {
	// Table of functions.
	var f = {"sin": Math.sin, "cos": Math.cos, "tan": Math.tan, 
		 "csc": cosecant, "sec": secant, "cot": cotangent, 
		 "exp": Math.exp, "ln": Math.log, "abs": Math.abs};
	// Table of constants.
	var c = {"pi": Math.PI, "e": Math.E};
	var a, b, tok;
	var result = [];  // represents the evaluation stack

	for (var i = 0, len = postfix.length; i < len; i++) {
	    tok = postfix[i];
	    if (tok.type === 'NUMBER') {
		result.push(parseFloat(tok.token));
	    } else if (tok.type === 'CONSTANT') {
		result.push(c[tok.token]);
	    } else if (tok.type === 'VARIABLE') {
		result.push(value);
	    } else if (tok.type === 'NEGATION') {
		a = result.pop();
		result.push(-a);
	    } else if (tok.type === '+') {
		b = result.pop();
		a = result.pop();
		result.push(a + b);
	    } else if (tok.type === '-') {
		b = result.pop();
		a = result.pop();
		result.push(a - b);
	    } else if (tok.type === '*') {
		b = result.pop();
		a = result.pop();
		result.push(a * b);
	    } else if (tok.type === '/') {
		b = result.pop();
		a = result.pop();
		result.push(a / b);
	    } else if (tok.type === '^') {
		b = result.pop();
		a = result.pop();
		result.push(Math.pow(a, b));
	    } else if (tok.type === 'FUNCTION') {
		a = result.pop();
		result.push(f[tok.token](a));
	    }
	}
	// Last element in the evaluation stack is the result,
	// so we return it.
	return result.pop();
    }

    // Parses the <input> text using the "parse" method above, then creates 
    // and returns a function to evaluate the parsed expression.
    function parse_helper(input) {
	var postfix;
	try {
	    postfix = parse(input);
	    return function(val) { return evaluate_postfix(postfix, val); }
	} catch (exception) {
	    return null;
	}
    }

    // Expose one method, named "parse" from this module.
    return { parse: parse_helper };

})();
