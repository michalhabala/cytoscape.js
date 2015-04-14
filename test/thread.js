var expect = require('chai').expect;
var cytoscape = require('../build/cytoscape.js', cytoscape);
var $$ = cytoscape;

describe('Thread', function(){

  var cy;
  var n;
  var eles;

  before(function(next){
    cy = cytoscape({
      elements: [
        {
          group: 'nodes',
          data: { id: 'n', foo: 'bar' }
        },

        {
          group: 'edges',
          data: { id: 'e', source: 'n', target: 'n', foo: 'baz' }
        }
      ],

      ready: function(){
        next();
      }
    });

    n = cy.$('#n')[0];
    eles = cy.elements().sort(function(a, b){
      if( a.id() === 'n' ){
        return -1;
      } else {
        return 1;
      }
    });
  });

  it('resolves with a simple value', function( next ){
    var t = $$.Thread();

    t.run(function(){
      resolve( 3 );
    }).then(function( val ){
      expect( val ).to.equal(3);

      t.stop();

      next();
    });
  });

  it('resolves with a simple value via return', function( next ){
    var t = $$.Thread();

    t.run(function(){
      return 3;
    }).then(function( val ){
      expect( val ).to.equal(3);

      t.stop();

      next();
    });
  });

  it('rejects with a simple value', function( next ){
    var t = $$.Thread();

    t.run(function(){
      reject( 3 );
    }).then(function( val ){
      console.error('Thread resolved but should have rejected');
    }, function( err ){
      expect( err ).to.equal( 3 );

      t.stop();
      next();
    });
  });

  it('reports as stopped when stopped', function( next ){
    var t = $$.Thread();

    t.run(function(){
      resolve( 3 );
    }).then(function( val ){
      t.stop();

      expect( t.stopped() ).to.be.true;

      next();
    });
  });

  it('works with 2 threads at once', function( next ){
    var t1 = $$.Thread();
    var t2 = $$.Thread();

    $$.Promise.all([ // both threads done
      t1.run(function(){
        resolve( 1 );
      }),

      t2.run(function(){
        resolve( 2 );
      })
    ]).then(function( thens ){
      var v1 = thens[0];
      var v2 = thens[1];

      expect( v1 ).to.equal( 1 );
      expect( v2 ).to.equal( 2 );

      t1.stop();
      t2.stop();

      next();
    });
  });

  it('hears a message and roundtrips back', function( next ){
    var t = $$.Thread();
    var msg;

    t.run(function(){
      listen(function( m ){
        message(m);
      });
    });

    t.on('message', function(e){
      expect( e.message ).to.equal('hello there');

      t.stop();

      next();
    });

    t.message('hello there');
  });

  it('requires a named function', function( next ){
    var t = $$.Thread();
    
    function foo(){
      return 'bar';
    }

    t.require( foo );

    t.run(function(){
      message( foo() );
    });

    t.on('message', function(e){
      expect( e.message ).to.equal('bar');

      t.stop();

      next();
    });
  });

  it('requires a function with a prototype', function( next ){
    var t = $$.Thread();
    
    function foo(){
      
    }

    foo.prototype.bar = function(){
      return 'baz';
    };

    t.require( foo );

    t.run(function(){
      broadcast( ( new foo() ).bar() );
    });

    t.on('message', function(e){
      expect( e.message ).to.equal('baz');

      t.stop();

      next();
    });
  });

  it('requires a function with a subfunction', function( next ){
    var t = $$.Thread();
    
    function foo(){
      
    }

    foo.bar = function(){
      return 'baz';
    };

    t.require( foo );

    t.run(function(){
      broadcast( foo.bar() );
    });

    t.on('message', function(e){
      expect( e.message ).to.equal('baz');

      t.stop();

      next();
    });
  });

  it('requires a function with a specified name', function( next ){
    var t = $$.Thread();

    t.require( function(){
      return 'bar';
    }, 'bar' );

    t.run(function(){
      resolve( bar() );
    }).then(function( ret ){
      expect( ret ).to.equal('bar');

      t.stop();
      next();
    });
  });

  it('calls multiple runs in order', function( next ){
    var t = $$.Thread();
    var thens = [];

    t.promise(function(){
      // console.log('resolve(0)');

      resolve( 0 );
    }).then(function( r ){
      thens.push( r );
    });

    t.run(function(){
      // console.log('resolve(1)');

      resolve( 1 );
    }).then(function( r ){
      thens.push( r );
    });

    t.run(function(){
      // console.log('resolve(2)');

      resolve( 2 );
    }).then(function( r ){
      thens.push( r );
    });

    setTimeout(function(){
      expect( thens ).to.deep.equal([ 0, 1, 2 ]);

      t.stop();

      next();
    }, 250);
  });

  it('passes a string param', function( next ){
    var t = $$.Thread();

    t.pass('foo').run(function( param ){
      broadcast( param );
    });

    t.on('message', function(e){
      expect( e.message ).to.equal('foo');

      t.stop();

      next();
    });
  });

  it('passes an object param', function( next ){
    var t = $$.Thread();

    t.pass({ foo: 'bar' }).run(function( param ){
      broadcast( param );
    });

    t.on('message', function(e){
      expect( e.message ).to.deep.equal({ foo: 'bar' });

      t.stop();

      next();
    });
  });

  it('passes correctly for multiple runs', function( next ){
    var t = $$.Thread();
    var vals = [];

    t.pass('alpha').run(function( param ){
      resolve( param + '-beta' );
    }).then(function( val ){
      vals.push( val );
    });

    t.pass('gamma').run(function( param ){
      resolve( param + '-delta' );
    }).then(function( val ){
      vals.push( val );
    });

    t.pass('epsilon').run(function( param ){
      resolve( param + '-zeta' );
    }).then(function( val ){
      vals.push( val );
    });

    setTimeout(function(){
      expect( vals.length ).to.equal(3);

      for( var i = 0; i < vals.length; i++ ){
        var val = vals[i];
        var ls = val.split('-');

        if( ls[0] === 'alpha' ){
          expect( ls[1] ).to.equal('beta');
        } else if( ls[0] === 'gamma' ){
          expect( ls[1] ).to.equal('delta');
        } else if( ls[0] === 'epsilon' ){
          expect( ls[1] ).to.equal('zeta');
        }
      }

      t.stop();
      next();
    }, 250);

  });

  it('passes correctly for multiple runs with gaps', function( next ){
    var t = $$.Thread();
    var vals = [];

    t.pass('alpha').run(function( param ){
      resolve( param + '-beta' );
    }).then(function( val ){
      vals.push( val );
    });

    t.run(function( param ){
      resolve( 'gap' );
    }).then(function( val ){
      vals.push( val );
    });

    t.pass('gamma').run(function( param ){
      resolve( param + '-delta' );
    }).then(function( val ){
      vals.push( val );
    });

    t.run(function( param ){
      resolve( 'gap' );
    }).then(function( val ){
      vals.push( val );
    });

    t.pass('epsilon').run(function( param ){
      resolve( param + '-zeta' );
    }).then(function( val ){
      vals.push( val );
    });

    setTimeout(function(){
      expect( vals.length ).to.equal(5);

      for( var i = 0; i < vals.length; i++ ){
        var val = vals[i];
        var ls = val.split('-');

        if( ls[0] === 'alpha' ){
          expect( ls[1] ).to.equal('beta');
        } else if( ls[0] === 'gamma' ){
          expect( ls[1] ).to.equal('delta');
        } else if( ls[0] === 'epsilon' ){
          expect( ls[1] ).to.equal('zeta');
        } else {
          expect( val ).to.equal('gap');
        }
      }

      t.stop();
      next();
    }, 250);

  });

  it('maps correctly', function( next ){
    var t = $$.Thread();
    var mapper = function( n ){
      return Math.pow( 2, n );
    };
    var data = [1, 2, 3, 4];

    t.pass( data ).map( mapper ).then(function( mapped ){
      var expMapped = data.map( mapper );

      expect( mapped ).to.deep.equal( expMapped );

      t.stop();
      next();
    });
  });

  it('maps correctly via resolve()', function( next ){
    var t = $$.Thread();
    var mapper = function( n ){
      resolve( Math.pow( 2, n ) );
    };
    var fnmapper = function( n ){
      return ( Math.pow( 2, n ) );
    };
    var data = [1, 2, 3, 4];
    var expMapped = data.map( fnmapper );

    t.pass( data ).map( mapper ).then(function( mapped ){

      expect( mapped ).to.deep.equal( expMapped );

      t.stop();
      next();
    });
  });

  it('reduces correctly', function( next ){
    var t = $$.Thread();
    var reducer = function( prev, current, index, array ){
      return prev - current;
    };
    var data = [1, 2, 3, 4];

    t.pass( data ).reduce( reducer ).then(function( res ){
      var exp = data.reduce( reducer );

      expect( res ).to.deep.equal( exp );

      t.stop();
      next();
    });
  });

  it('reduces right correctly', function( next ){
    var t = $$.Thread();
    var reducer = function( prev, current ){
      return prev - current;
    };
    var data = [1, 2, 3, 4];

    t.pass( data ).reduceRight( reducer ).then(function( res ){
      var exp = data.reduceRight( reducer );

      expect( res ).to.deep.equal( exp );

      t.stop();
      next();
    });
  });

  // because .map() etc has to be serialised with a special global name
  it('allows successive uses of map', function( next ){
    var t = $$.Thread();
    var mapper1 = function( n ){
      return Math.pow( 2, n );
    };
    var mapper2 = function( n ){
      return Math.pow( 3, n );
    };
    var data = [1, 2, 3, 4];

    t.pass( data ).map( mapper1 ).then(function( mapped ){
      var expMapped = data.map( mapper1 );

      expect( mapped ).to.deep.equal( expMapped );
    });

    t.pass( data ).map( mapper2 ).then(function( mapped ){
      var expMapped = data.map( mapper2 );

      expect( mapped ).to.deep.equal( expMapped );

      t.stop();
      next();
    });
  });

  it('passes ele properly', function( next ){
    var t = $$.Thread();

    t.pass( n.json() ).run(function( n ){
      resolve(n);
    }).then(function( n ){
      expect( n.data.foo ).to.equal('bar');

      t.stop();
      next();
    });
  });

  it('passes eles properly', function( next ){
    var t = $$.Thread();

    t.pass( eles.jsons() ).run(function( eles ){
      resolve(eles);
    }).then(function( eles ){
      expect( eles[0].data.foo ).to.equal('bar');
      expect( eles[1].data.foo ).to.equal('baz');

      t.stop();
      next();
    });
  });

});