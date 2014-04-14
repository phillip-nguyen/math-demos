var MATH = (function() {
    
    var my = {};

    // Returns the least factor of n, or n itself if n is prime.
    // The search is started from the supplied start number.
    // When called on a number which has no prime factors less than
    // start, the least factor returned will necessarily be prime.
    function least_factor(n, start) {
	if (typeof(start) === "undefined") start = 2;
	// Take care of 2 as a special case.
	if (start === 2 && (n & 1) === 0) { return 2; }
	// If start is an even number, make it odd.
	if ((start & 1) === 0) { start += 1; }
	// Do trial division by all odd numbers up to the square root of n.
	var ubound = Math.floor(Math.sqrt(n));
	var i = start;
	while (i <= ubound) {
	    if (n % i === 0) {
		return i;
	    }
	    i += 2;
	}
	return n;
    }

    // Returns a list of tuples of the form [p, k] where p^k is a factor
    // of the number n.
    function prime_factors(n) {
	var factors = [];
	var start = 2;
	// Loop until all prime factors have been divided out of n.
	while (n !== 1) {
	    var p = least_factor(n, start);
	    // Divide p out of n as many times as possible.
	    var k = 1;
	    n /= p;
	    while (n % p === 0) {
		k += 1;
		n /= p;
	    }
	    // p^k was a factor of n.
	    factors.push( [p, k] );
	    // The next prime factor of n must be at least p + 1.
	    // (It is in fact at least p + 2 if p != 2.)
	    start = p + 1;
	}
	return factors;
    }
    
    // Given a list of prime power factors written as [p, k], this
    // recursive method returns a list of all possible divisors of the
    // product of the primes.
    function divisors_of_prime_factors(prime_factors) {
	if (prime_factors.length === 0) {
	    return [1];
	} else {
	    var pk = prime_factors.pop();
	    var p = pk[0], k = pk[1];
	    var ls = divisors_of_prime_factors(prime_factors);
	    var divisors = [];
	    pk = 1;
	    for (var i = 0; i < k+1; i++) {
		for (var j = 0; j < ls.length; j++) {
		    divisors.push(pk*ls[j]);
		}
		pk *= p;
	    }
	    return divisors;
	}
    }

    // Returns a list of all divisors of n.
    function get_divisors(n) {
	var pf = prime_factors(n);
	return divisors_of_prime_factors(pf);
    }

    // Returns a list of all prime factors of n, including repeated factors.
    function factor(n) {
	var factors = [];
	var pf = prime_factors(n);
	for (var i = 0; i < pf.length; i++) {
	    var p = pf[i][0], k = pf[i][1];
	    while (k > 0) {
		factors.push(p);
		k -= 1;
	    }
	}
	return factors;
    }

    // Uses trial division to return all possible pairs [a, b] 
    // such that n = a * b with a < b.
    function factor_pairs(n) {
	var pairs = [];
	for (var i = 1, root=Math.sqrt(n); i <= root; i++) {
	    if (n % i === 0) {
		pairs.push( [i, n/i] );
	    }
	}
	return pairs;
    }

    // Returns the greatest common divisor of a and b.
    // Note: the GCD is the largest *positive* integer that divides the numbers without remainder.
    // So we should be sure to return a positive answer.
    function gcd(a, b) {
	if (b === 0) return Math.abs(a);
	return gcd(b, a % b);
    }

    // Returns the least common multiple of a and b.
    function lcm(a, b) {
	return a*b/gcd(a,b);
    }

    function is_integer(x) {
	return (x % 1 === 0);
    }

    // Simplifies a rational number represented as a two element array
    // such that [p, q] <---> p/q.
    // In canonical form, should be reduced so that gcd(p, q) == 1
    // and q is a positive number.
    function rat_simplify(r) {
	var p = r[0], q = r[1];
	if (is_integer(p) && is_integer(q)) {
	    var d = gcd(p, q);
	    p /= d;
	    q /= d;
	} else {
	    p = p/q;
	    q = 1;
	}
	if (q < 0) {
	    p *= -1;
	    q *= -1;
	}
	return [p, q];
    }
    
    // Performs operations on rational numbers,
    // simplifying the result.
    function rat_mul(r1, r2) {
	var p = r1[0]*r2[0];
	var q = r1[1]*r2[1];
	return rat_simplify([p, q]);
    }

    function rat_div(r1, r2) {
	var p = r1[0]*r2[1];
	var q = r1[1]*r2[0];
	return rat_simplify([p, q]);	
    }

    function rat_add(r1, r2) {
	var p = r1[0]*r2[1] + r1[1]*r2[0];
	var q = r1[1]*r2[1];
	return rat_simplify([p, q]);
    }

    function rat_sub(r1, r2) {
	var p = r1[0]*r2[1] - r1[1]*r2[0];
	var q = r1[1]*r2[1];
	return rat_simplify([p, q]);
    }

    function rat_neg(r) {
	return rat_simplify([-r[0], r[1]]);
    }

    // Multiplies the rational number r by a scalar value k.
    // When k is an integer the result will still be rational.
    // If k is non-integral then an object of the form [r, 1]
    // will be returned where r is a real number.
    function rat_scale(r, k) {
	return rat_simplify([k*r[0], r[1]]);
    }

    function rat_real(r) {
	return r[0] / r[1];
    }


    // Parses a string representing a rational number into 
    // an object of the form [p, q].
    // Special cases:
    // If str represents an integer value, then return [p, 1] where p is an integer.
    // If str is a decimal, then returns [r, 1] where r is a real number
    // If str is a decimal / decimal then divides and returns [r, 1]
    function parse_rational(str) {
	var r = str.split('/');
	var p, q;
	if (r.length === 1) {
	    if (r[0] === "") return false;
	    p = Number(r[0]);
	    if (isNaN(p)) return false;
	    return [p, 1]; // p may be a decimal number.
	} else if (r.length === 2) {
	    if (r[0] === "" || r[1] === "") return false;
	    p = Number(r[0]);
	    q = Number(r[1]);
	    if (isNaN(p) || isNaN(q)) return false;
	    if (is_integer(p) && is_integer(q)) {
		return [p, q];
	    } else {
		return [p/q, 1];
	    }
	}
	return false;
    }

    my.divisors = get_divisors;
    //my.prime_factors = prime_factors;
    //my.least_factor = least_factor;
    my.factor = factor;
    my.factor_pairs = factor_pairs;
    my.gcd = gcd;
    my.lcm = lcm;

    my.rat_simplify = rat_simplify;
    my.rat_mul = rat_mul;
    my.rat_div = rat_div;
    my.rat_add = rat_add;
    my.rat_sub = rat_sub;
    my.rat_neg = rat_neg;
    my.rat_scale = rat_scale;
    my.rat_real = rat_real;

    my.is_integer = is_integer;
    my.parse_rational = parse_rational;

    return my;
}());
