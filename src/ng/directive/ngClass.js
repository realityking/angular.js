'use strict';

function classDirective() {
  return ['$animate', function($animate) {
    return {
      restrict: 'AC',
      link: function(scope, element, attr) {
        var oldVal;

        scope.$watch(attr['ngClass'], ngClassWatchAction, true);

        attr.$observe('class', function(value) {
          ngClassWatchAction(scope.$eval(attr['ngClass']));
        });

        function addClasses(classes) {
          var newClasses = digestClassCounts(classes, 1);
          attr.$addClass(newClasses);
        }

        function removeClasses(classes) {
          var newClasses = digestClassCounts(classes, -1);
          attr.$removeClass(newClasses);
        }

        function digestClassCounts(classes, count) {
          var classCounts = element.data('$classCounts') || {};
          var classesToUpdate = [];
          forEach(classes, function(className) {
            if (count > 0 || classCounts[className]) {
              classCounts[className] = (classCounts[className] || 0) + count;
              if (classCounts[className] === +(count > 0)) {
                classesToUpdate.push(className);
              }
            }
          });
          element.data('$classCounts', classCounts);
          return classesToUpdate.join(' ');
        }

        function updateClasses(oldClasses, newClasses) {
          var toAdd = arrayDifference(newClasses, oldClasses);
          var toRemove = arrayDifference(oldClasses, newClasses);
          toAdd = digestClassCounts(toAdd, 1);
          toRemove = digestClassCounts(toRemove, -1);
          if (toAdd && toAdd.length) {
            $animate.addClass(element, toAdd);
          }
          if (toRemove && toRemove.length) {
            $animate.removeClass(element, toRemove);
          }
        }

        function ngClassWatchAction(newVal) {
          var newClasses = arrayClasses(newVal || []);
          if (!oldVal) {
            addClasses(newClasses);
          } else if (!equals(newVal,oldVal)) {
            var oldClasses = arrayClasses(oldVal);
            updateClasses(oldClasses, newClasses);
          }
          oldVal = shallowCopy(newVal);
        }
      }
    };

    function arrayDifference(tokens1, tokens2) {
      var values = [];

      outer:
      for (var i = 0; i < tokens1.length; i++) {
        var token = tokens1[i];
        for (var j = 0; j < tokens2.length; j++) {
          if (token == tokens2[j]) continue outer;
        }
        values.push(token);
      }
      return values;
    }

    function arrayClasses(classVal) {
      if (isArray(classVal)) {
        return classVal.join(' ').split(' ');
      } else if (isString(classVal)) {
        return classVal.split(' ');
      } else if (isObject(classVal)) {
        var classes = [];
        forEach(classVal, function(v, k) {
          if (v) {
            classes = classes.concat(k.split(' '));
          }
        });
        return classes;
      }
      return classVal;
    }
  }];
}

/**
 * @ngdoc directive
 * @name ngClass
 * @restrict AC
 *
 * @description
 * The `ngClass` directive allows you to dynamically set CSS classes on an HTML element by databinding
 * an expression that represents all classes to be added.
 *
 * The directive operates in three different ways, depending on which of three types the expression
 * evaluates to:
 *
 * 1. If the expression evaluates to a string, the string should be one or more space-delimited class
 * names.
 *
 * 2. If the expression evaluates to an array, each element of the array should be a string that is
 * one or more space-delimited class names.
 *
 * 3. If the expression evaluates to an object, then for each key-value pair of the
 * object with a truthy value the corresponding key is used as a class name.
 *
 * The directive won't add duplicate classes if a particular class was already set.
 *
 * When the expression changes, the previously added classes are removed and only then the
 * new classes are added.
 *
 * @animations
 * **add** - happens just before the class is applied to the elements
 *
 * **remove** - happens just before the class is removed from the element
 *
 * @element ANY
 * @param {expression} ngClass {@link guide/expression Expression} to eval. The result
 *   of the evaluation can be a string representing space delimited class
 *   names, an array, or a map of class names to boolean values. In the case of a map, the
 *   names of the properties whose values are truthy will be added as css classes to the
 *   element.
 *
 * @example Example that demonstrates basic bindings via ngClass directive.
   <example>
     <file name="index.html">
       <p ng-class="{strike: deleted, bold: important, red: error}">Map Syntax Example</p>
       <input type="checkbox" ng-model="deleted"> deleted (apply "strike" class)<br>
       <input type="checkbox" ng-model="important"> important (apply "bold" class)<br>
       <input type="checkbox" ng-model="error"> error (apply "red" class)
       <hr>
       <p ng-class="style">Using String Syntax</p>
       <input type="text" ng-model="style" placeholder="Type: bold strike red">
       <hr>
       <p ng-class="[style1, style2, style3]">Using Array Syntax</p>
       <input ng-model="style1" placeholder="Type: bold, strike or red"><br>
       <input ng-model="style2" placeholder="Type: bold, strike or red"><br>
       <input ng-model="style3" placeholder="Type: bold, strike or red"><br>
     </file>
     <file name="style.css">
       .strike {
         text-decoration: line-through;
       }
       .bold {
           font-weight: bold;
       }
       .red {
           color: red;
       }
     </file>
     <file name="protractor.js" type="protractor">
       var ps = element.all(by.css('p'));

       it('should let you toggle the class', function() {

         expect(ps.first().getAttribute('class')).not.toMatch(/bold/);
         expect(ps.first().getAttribute('class')).not.toMatch(/red/);

         element(by.model('important')).click();
         expect(ps.first().getAttribute('class')).toMatch(/bold/);

         element(by.model('error')).click();
         expect(ps.first().getAttribute('class')).toMatch(/red/);
       });

       it('should let you toggle string example', function() {
         expect(ps.get(1).getAttribute('class')).toBe('');
         element(by.model('style')).clear();
         element(by.model('style')).sendKeys('red');
         expect(ps.get(1).getAttribute('class')).toBe('red');
       });

       it('array example should have 3 classes', function() {
         expect(ps.last().getAttribute('class')).toBe('');
         element(by.model('style1')).sendKeys('bold');
         element(by.model('style2')).sendKeys('strike');
         element(by.model('style3')).sendKeys('red');
         expect(ps.last().getAttribute('class')).toBe('bold strike red');
       });
     </file>
   </example>

   ## Animations

   The example below demonstrates how to perform animations using ngClass.

   <example module="ngAnimate" deps="angular-animate.js" animations="true">
     <file name="index.html">
      <input id="setbtn" type="button" value="set" ng-click="myVar='my-class'">
      <input id="clearbtn" type="button" value="clear" ng-click="myVar=''">
      <br>
      <span class="base-class" ng-class="myVar">Sample Text</span>
     </file>
     <file name="style.css">
       .base-class {
         -webkit-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 0.5s;
         transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 0.5s;
       }

       .base-class.my-class {
         color: red;
         font-size:3em;
       }
     </file>
     <file name="protractor.js" type="protractor">
       it('should check ng-class', function() {
         expect(element(by.css('.base-class')).getAttribute('class')).not.
           toMatch(/my-class/);

         element(by.id('setbtn')).click();

         expect(element(by.css('.base-class')).getAttribute('class')).
           toMatch(/my-class/);

         element(by.id('clearbtn')).click();

         expect(element(by.css('.base-class')).getAttribute('class')).not.
           toMatch(/my-class/);
       });
     </file>
   </example>


   ## ngClass and pre-existing CSS3 Transitions/Animations
   The ngClass directive still supports CSS3 Transitions/Animations even if they do not follow the ngAnimate CSS naming structure.
   Upon animation ngAnimate will apply supplementary CSS classes to track the start and end of an animation, but this will not hinder
   any pre-existing CSS transitions already on the element. To get an idea of what happens during a class-based animation, be sure
   to view the step by step details of {@link ng.$animate#addClass $animate.addClass} and
   {@link ng.$animate#removeClass $animate.removeClass}.
 */
var ngClassDirective = classDirective();
