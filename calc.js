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
	    if (find_next_match("VARIABLE", /^x/)) continue;
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

    // Given an array representing an expression parsed into postfix form,
    // returns an equivalent parse tree.
    function tree_from_postfix(postfix) {
	// Table of constants.
	var c = {"pi": Math.PI, "e": Math.E};
	var stack = [];
	for (var i = 0, len = postfix.length; i < len; i++) {
	    var tok = postfix[i];
	    if (tok.type === 'NUMBER') {
		var node = {type: 'NUMBER', value: parseFloat(tok.token)};
		stack.push(node);
	    } else if (tok.type === 'CONSTANT') {
		var node = {type: 'NUMBER', value: c[tok.token]};
		stack.push(node);
	    } else if (tok.type === 'VARIABLE') {
		var node = {type: tok.type};
		stack.push(node);
	    } else if (tok.type === '+' || tok.type === '-' || tok.type === '*' || tok.type === '/' || tok.type === '^') {
		var node = {type: 'BINARYOP', operator: tok.type, right: stack.pop(), left: stack.pop() };
		stack.push(node);
	    } else if (tok.type === 'NEGATION') {
		var node = {type: 'UNARYOP', operator: tok.type, child: stack.pop()}
		stack.push(node);
	    } else if (tok.type === 'FUNCTION') {
		var node = {type: 'UNARYOP', operator: tok.type, func: tok.token, child: stack.pop()}
		stack.push(node);
	    }
	}
	return stack.pop();
    }

    function evaluate_tree(node, value) {
	// Table of functions.
	var f = {"sin": Math.sin, "cos": Math.cos, "tan": Math.tan, 
		 "csc": cosecant, "sec": secant, "cot": cotangent, 
		 "exp": Math.exp, "ln": Math.log, "abs": Math.abs};

	if (node.type === 'NUMBER') return node.value;
	if (node.type === 'VARIABLE') return value;
	if (node.operator === 'NEGATION') return -evaluate_tree(node.child, value);
	if (node.operator === 'FUNCTION') return f[node.func](evaluate_tree(node.child, value));
	if (node.operator === '+') return evaluate_tree(node.left, value) + evaluate_tree(node.right, value);
	if (node.operator === '-') return evaluate_tree(node.left, value) - evaluate_tree(node.right, value);
	if (node.operator === '*') return evaluate_tree(node.left, value) * evaluate_tree(node.right, value);
	if (node.operator === '/') return evaluate_tree(node.left, value) / evaluate_tree(node.right, value);
	if (node.operator === '^') return Math.pow(evaluate_tree(node.left, value), evaluate_tree(node.right, value));
	return undefined;
    }

    // Returns true if all leaf nodes of the parse tree are numbers.
    function is_constant(node) {
	if (node.type === 'NUMBER') return true;
	if (node.type === 'VARIABLE') return false;
	if (node.type === 'UNARYOP') return is_constant(node.child);
	if (node.type === 'BINARYOP') return (is_constant(node.left) && is_constant(node.right));
	return false;
    }

    // Returns true if the given expression tree could be represented as a polynomial.
    function is_polynomial(node) {
	if (node.type === 'NUMBER') return true;
	if (node.type === 'VARIABLE') return true;
	if (node.operator === 'FUNCTION') return is_constant(node.child);
	if (node.operator === 'NEGATION') return is_polynomial(node.child);
	if (node.operator === '/') return (is_polynomial(node.left) && is_constant(node.right));
	if (node.operator === '^') {
	    if (!is_polynomial(node.left)) return false;
	    if (!is_constant(node.right)) return false;
	    var exponent = evaluate_tree(node.right);
	    return (is_integer(exponent) && exponent >= 0);
	}
	if (node.type === 'BINARYOP') return (is_polynomial(node.left) && is_polynomial(node.right));
	return false;
    }

    // Returns true if the given expression would simplify down to c*x^r.
    // However, expressions such as 2*sin(3/2)/7*4*x*x^cos(1.5) would return true.
    function is_monomial(node) {
	if (node.type === 'NUMBER') return true;
	if (node.type === 'VARIABLE') return true;
	if (node.operator === 'FUNCTION') return is_constant(node.child);
	if (node.operator === 'NEGATION') return is_monomial(node.child);
	if (node.operator === '+' || node.operator === '-') return false;
	if (node.operator === '/' || node.operator === '^') return (is_monomial(node.left) && is_constant(node.right));
	if (node.operator === '*') return (is_monomial(node.left) && is_monomial(node.right));
	return false;
    }

    // Given a polynomial p in vector form and a scalar value k, returns k*p.
    function scale_poly(k, p) {
	var kp = [];
	for (var i=0, len=p.length; i < len; i++) {
	    kp.push(k*p[i]);
	}
	return kp;
    }

    // Given an integer exponent k, returns a vector representation for x^k.
    // For example, x^3 = x_to_power(3) = [0, 0, 0, 1].
    function x_to_power(k) {
	if (!is_integer(k) || k < 0) {
	    throw { type: 'ValueError', msg: 'Exponent ' + k + ' is not a whole number.' };
	}
	var p = [];
	for (var i = 0; i < k; i++) {
	    p.push(0);
	}
	p.push(1);
	return p;
    }


    // Given two vectors p and q represented in vector form, returns 
    // their product p*q also as a vector.  The following example shows what 
    // the algorithm does:
    // p = [1 0 2 4]
    // q = [3 1 5]
    // p * q = [1*3, 1*1 + 0*3, 1*5 + 0*1 + 2*3, 0*5 + 2*1 + 4*3, 2*5 + 4*1, 4*5]
    function mul_poly(p, q) {
	var result = [];
	var n = p.length;  // degree of p is (n-1)
	var m = q.length;  // degree of q is (m-1)
	// degree of p*q is (n-1)+(m-1) = n + m - 2.
	// So we want 0 <= i <= n + m - 2 ==> 0 <= i < n + m - 1.
	for (var i = 0; i < n + m - 1; i++) {
	    result[i] = 0;
	    // j iterates from 0 to i.  However
	    // p[j] requires that 0 <= j < n.
	    // q[i-j] requires that 0 <= i - j < m ==> -i <= -j < m - i ==> i - m < j =< i ==> i - m + 1 <= j < i+1
	    // Thefore j starts at max(0, i-m+1) and ends before min(i+1, n).
	    for (var j = Math.max(0, i-m+1); j < Math.min(i+1, n); j++) {
		result[i] += p[j]*q[i-j];
		//alert('result['+i+'] += p['+j+']*q['+(i-j)+'] = '+p[j]+'*'+q[i-j]);
	    }
	}
	return result;
    }

    // Given two polynomials p and q represented in vector form,
    // returns their sum p + q.  The resulting vector may have 
    // leading 0 coefficients.
    function add_poly(p, q) {
	var result = [];
	var max = Math.max(p.length, q.length);
	for (var i = 0; i < max; i++) {
	    result[i] = (p[i] || 0) + (q[i] || 0);
	}
	return result;
    }

    // Given two polynomials p and q represented in vector form, 
    // returns their difference p - q.  Note that the resulting vector
    // may have leading 0 coefficients.
    function sub_poly(p, q) {
	var result = [];
	var max = Math.max(p.length, q.length);
	for (var i = 0; i < max; i++) {
	    result[i] = (p[i] || 0) - (q[i] || 0);
	}
	return result;
    }

    // Returns a list of polynomial coefficients, assuming that the given node 
    // represents an expression that simplifies into a polynomial.  Note that in the
    // process of getting the coefficients, it also simplifies the polynomial by
    // multiplying factors and adding like terms so that a node representing
    // (3x+5)*(2x-1) will return [-5, 7, 6] representing -5 + 7x + 6x^2.
    // So wish to treat the expressions (3x+5)*(2x-1) and 6x^2 + 7x - 5 differently,
    // then this function is not what you want.
    function get_polynomial_coefficients(node) {
	if (node.type === 'NUMBER') return [node.value];
	if (node.type === 'VARIABLE') return [0, 1];
	if (node.operator === 'NEGATION') return scale_poly(-1, get_polynomial_coefficients(node.child));
	if (node.operator === '^') {
	    if (node.left.type === 'VARIABLE' && is_constant(node.right)) {
		var exponent = evaluate_tree(node.right)
		return x_to_power(exponent);
	    } 
	    throw { type: 'SyntaxError', msg: 'Bad args to ^ operator.' };
	}
	if (node.operator === '*') return mul_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '+') return add_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '-') return sub_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '/') {
	    if (is_constant(node.right)) {
		var denom = evaluate_tree(node.right);
		return scale_poly(1/denom, get_polynomial_coefficients(node.left));
	    } 
	    throw { type: 'SyntaxError', msg: 'Dividing by variable expression.' };
	}
	
    }

    // Returns a list of nodes split up into terms, by
    // separating the original tree at + and - operations.
    function get_terms(node) {
	if (node.operator === '+') {
	    var left = get_terms(node.left);
	    var right = get_terms(node.right);
	    left.push.apply(left, right);
	    return left;
	}
	if (node.operator === '-') {
	    var left = get_terms(node.left);
	    var right = get_terms(node.right);
	    for (var i=0, len=right.length; i < len; i++) {
		left.push( {type: 'UNARYOP', operator: 'NEGATION', child: right[i]} );
	    }
	    return left;
	}
	return [node];
    }

    function contains_addition_or_subtraction(node) {
	if (node.type === 'NUMBER' || node.type === 'VARIABLE') return false;
	if (node.operator === '+' || node.operator === '-') return true;
	if (node.type === 'UNARYOP') return contains_addition_or_subtraction(node.child);
	if (node.type === 'BINARYOP') return (contains_addition_or_subtraction(node.left) || contains_addition_or_subtraction(node.right));
    }

    // Returns true if the node is an fraction of numbers like 2/3 or 3.5/100
    function is_numeric_fraction(node) {
	return (node.operator === '/' && node.left.type === 'NUMBER' && node.right.type === 'NUMBER');
    }

    // Returns true if any of the exponent (^) expressions are not of the form x^k where k is a number.
    function contains_bad_exponents(node) {
	if (node.type === 'NUMBER' || node.type === 'VARIABLE') return false;
	if (node.operator === '^') {
	    if (node.left.type !== 'VARIABLE') return true;
	    if (node.left.type === 'NUMBER') return false;
	    if (is_numeric_fraction(node.left)) return false;
	    return true;
	}
	if (node.type === 'UNARYOP') return contains_bad_exponents(node.child);
	if (node.type === 'BINARYOP') return (contains_bad_exponents(node.left) || contains_bad_exponents(node.right));
    }

//    function is_simplified_monomial(node) {
//	if (contains_addition_or_subtraction(node)) return false;
//	if (contains_bad_exponents(node)) return false;
//	if (contains_unsimplified_ceofficient(node)) return false;
//	return true;
//    }


    // Can also check x % 1 === 0.
    // Not sure which is faster.
    function is_integer(x) {
	return Math.floor(x) === x;
    }

    // Returns the greatest common divisor of a and b.
    function gcd(a, b) {
	if (b === 0) return a;
	return gcd(b, a % b);
    }

    // Returns true if we have a coefficient which is either a single number, or
    // a rational fraction.
    function is_simplified_coefficient(node) {
	if (node.type === 'NUMBER') return true;
	if (node.operator === 'NEGATION') return is_simplified_coefficient(node.child);
	if (node.operator === '/') {
	    var numer, denom;
	    // If both the numerator and denominator are negated, then the
	    // fraction is not in simplified form.
	    if (node.left.operator === 'NEGATION' && node.right.operator === 'NEGATION') return false;
	    // A single negation is fine though -- extract the proper numerator and denominator.
	    if (node.left.operator === 'NEGATION') {
		numer = node.left.child;
	    } else {
		numer = node.left;
	    }
	    if (node.right.operator === 'NEGATION') {
		denom = node.right.child;
	    } else {
		denom = node.right;
	    }
	    // Make sure that both the numerator and denominator are number values
	    // and that they are integers.
	    if (numer.type !== 'NUMBER' || denom.type !== 'NUMBER') return false;
	    if (!is_integer(numer.value)) return false;
	    if (!is_integer(denom.value)) return false;
	    // Make sure that we're not dividing by zero.
	    if (denom.value === 0) return false;
	    // Check that fraction is in reduced form.
	    if (Math.abs(denom.value) === 1) return false;
	    if (Math.abs(gcd(numer.value, denom.value)) !== 1) return false;
	    return true;
	}
	return false;
    }

    function is_power_of_x(node) {
	if (node.type === 'VARIABLE') return true;
	if (node.operator === '^') {
	    return (node.left.type === 'VARIABLE' && node.right.type === 'NUMBER' && is_integer(node.right.value) && node.right.value >= 0);
	}
	return false;
    }

    function is_simplified_monomial(node) {
	if (node.type === 'NUMBER' || node.type === 'VARIABLE') return true;
	if (is_power_of_x(node)) return true;
	if (node.operator === '*') return (is_simplified_coefficient(node.left) && is_power_of_x(node.right));
	if (node.operator === 'NEGATION') return is_simplified_monomial(node.child);
	return false;
    }

    // Returns the degree of a polynomial node.
    // The zero polynomial returns degree 0 for the sake of simplicity.
    function polynomial_degree(node) {
	var p = get_polynomial_coefficients(node);
	for (var i = p.length - 1; i >= 0; i--) {
	    if (p[i] !== 0) return i;
	}
	return 0;
    }

    function is_simplified(node) {
	var terms = get_terms(node);
	var degrees = [];
	// Check that every term is a simplified monomial.
	for (var i = 0; i < terms.length; i++) {
	    var term = terms[i];
	    if (!is_simplified_monomial(term)) return false;
	    // Check that there aren't any uncombined like terms.
	    var d = polynomial_degree(term);
	    if (degrees[d] === true) {
		return false;
	    } else {
		degrees[d] = true;
	    }
	}
	return true;
    }

    // A shallow equality test for arrays.  Returns true only if
    // the first level items in both arrays are identically equal.
    function arrayEquals(a, b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	for (var i=0, len=a.length; i < len; i++) {
	    if (a[i] !== b[i]) return false;
	}
	return true;
    }


    function equals_simplified_poly(input, poly) {
	var postfix = parse(input);
	var node = tree_from_postfix(postfix);
	if (!is_polynomial(node)) return false;
	if (!is_simplified(node)) return false;
	return arrayEquals(poly, get_polynomial_coefficients(node));
    }

    // Dear self: Just write a special parser for polynomial expressions so that 
    // I don't have to continue with this shit.  If you want the input expression to have
    // a particular format, then you should explicitly parse for that format rather than
    // trying to make sure it's right after the fact.


    // expr -> expr_list + term | expr_list - term | term
    // monomial -> coeff | coeff x | coeff x ^ exp
    // coeff -> number | rational
    // rational -> number / number | (number / number)


    // Parses the <input> text using the "parse" method above, then creates 
    // and returns a function to evaluate the parsed expression.
    function parse_helper(input) {
	var postfix;
	try {
	    postfix = parse(input);
	    alert(JSON.stringify(postfix));
	    alert(JSON.stringify(tree_from_postfix(postfix)));
	    return function(val) { return evaluate_postfix(postfix, val); }
	} catch (exception) {
	    return null;
	}
    }

    function parse_tree(input) {
	return tree_from_postfix(parse(input));
    }

    // Expose one method, named "parse" from this module.
    //return { parse: parse_helper };
    return { parse: parse, 
	     parse_tree: parse_tree,
	     tree_from_postfix: tree_from_postfix, 
	     is_constant: is_constant, 
	     is_polynomial: is_polynomial,
	     is_monomial: is_monomial,
	     get_terms: get_terms,
	     get_polynomial_coefficients: get_polynomial_coefficients,
	     is_simplified: is_simplified,
	     is_simplified_monomial: is_simplified_monomial,
	     is_simplified_coefficient: is_simplified_coefficient,
	     polynomial_degree: polynomial_degree,
	     equals_simplified_poly: equals_simplified_poly,
	   };

})();
