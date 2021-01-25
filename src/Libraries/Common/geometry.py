# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import math
import numbers
import inspect
import collections
import numpy as np

# -----------------------------------------------------------------------------
#

eps_precision = 10 * np.finfo(np.float64).resolution
sqrt_eps_precision = np.sqrt(eps_precision)
flt_precision = np.float64

throwOnDegenerate = False

# -----------------------------------------------------------------------------
#
class Vector3(object):
    # -----------------------------------------------------------------------------
    #
    def __init__(self, *args, **kwargs):
        if len(args) == 0:
            self._data = np.array([0, 0, 0], dtype=flt_precision)
        elif len(args) == 3 and np.all([(lambda x: isinstance(x, (np.number, numbers.Number)))(li) for li in args]):
            self._data = np.array(args, dtype=flt_precision)
        elif len(args) == 1:
            arg = args[0]
            if isinstance(arg, collections.Iterable) and len(arg) == 3:
                self._data = np.array(arg, dtype=flt_precision)
            elif isinstance(arg, collections.Iterable) and len(arg) == 2:
                self._data = np.array((arg[0], arg[1], 0), dtype=flt_precision)
            elif type(arg) == Vector3:
                self._data = arg.array
            elif hasattr(arg, "x") and hasattr(arg, "y") and hasattr(arg, "z"):
                self._data = np.array([arg.x, arg.y, arg.z])
            else:
                raise Exception('__init__ : could not create vector: "{}" of type "{}"'.format(str(args[0]), str(type(args[0]))))
        else:
            raise Exception('__init__ : could not create vector: "{}" of type "{}"'.format(str(args[0]), str(type(args[0]))))

        self._is_position = kwargs.get('position', 1)

    # -----------------------------------------------------------------------------
    #
    def __getattr__(self, name):
        if name == 'x':
            return self._data[0]
        elif name == 'y':
            return self._data[1]
        elif name == 'z':
            return self._data[2]
        else:
            raise AttributeError('Attribute "{}" not found in Vector3'.format(name))

    # -----------------------------------------------------------------------------
    #
    def __setattr__(self, name, val):
        if name == 'x':
            self._data[0] = val
        elif name == 'y':
            self._data[1] = val
        elif name == 'z':
            self._data[2] = val
        elif name == 'pos':
            if type(val) == Vector3:
                self._data[:] = val.array
            elif is_three_sequence(val):
                self._data[:] = np.array(val)
        else:
            object.__setattr__(self, name, val)

    # -----------------------------------------------------------------------------
    #
    def __getitem__(self, n):
        return self._data[n]

    # -----------------------------------------------------------------------------
    #
    def __setitem__(self, n, val):
        self._data[n] = val

    # -----------------------------------------------------------------------------
    #
    def __eq__(self, v):
        if type(v) == Vector3:
            return np.allclose(self._data, v._data)
        else:
            return NotImplemented

    # -----------------------------------------------------------------------------
    #
    def __repr__(self):
        return ('<Vector3: ({:.5f}, {:.5f}, {:.5f})>'.format(*self._data))

    # -----------------------------------------------------------------------------
    #
    def __str__(self):
        return self.__repr__()

    # -----------------------------------------------------------------------------
    #
    def get_length(self):
        # returns Euclidean length.
        return np.sqrt(self.length_squared)

    # -----------------------------------------------------------------------------
    #
    length = property(get_length)

    # -----------------------------------------------------------------------------
    #
    def get_length_squared(self):
        # returns square of the standard Euclidean length.
        return np.dot(self._data, self._data)

    # -----------------------------------------------------------------------------
    #
    length_squared = property(get_length_squared)

    # -----------------------------------------------------------------------------
    #
    def normalize(self):
        # in-place normalization.
        length = self.length
        if length != 1.0:
            self._data = self._data / length

    # -----------------------------------------------------------------------------
    #
    def cross(self, v):
        # returns the cross product with v.
        return Vector3(np.cross(self._data, v._data))

    # -----------------------------------------------------------------------------
    #
    def __add__(self, v):
        # returns the sum of this and vector v.
        if type(v) == Vector3:
            return Vector3(self._data + v._data)
        elif type(v) == np.ndarray and v.shape == (3,):
            return Vector3(self._data + v)
        else:
            return NotImplemented

    # -----------------------------------------------------------------------------
    #
    def __sub__(self, v):
        # returns vector v subracted from this.
        if type(v) == Vector3:
            return Vector3(self._data - v._data)
        elif type(v) == np.ndarray and v.shape == (3,):
            return Vector3(self._data - v)
        else:
            return NotImplemented

    # -----------------------------------------------------------------------------
    #
    def applyMatrix4(self, m):
        x = self.x; y = self.y; z = self.z; w = 1.0;

        self.x = m._data[ 0 ] * x + m._data[ 4 ] * y + m._data[ 8 ] * z + m._data[ 12 ] * w;
        self.y = m._data[ 1 ] * x + m._data[ 5 ] * y + m._data[ 9 ] * z + m._data[ 13 ] * w;
        self.z = m._data[ 2 ] * x + m._data[ 6 ] * y + m._data[ 10 ] * z + m._data[ 14 ] * w;
        w = m._data[ 3 ] * x + m._data[ 7 ] * y + m._data[ 11 ] * z + m._data[ 15 ] * w;

# -----------------------------------------------------------------------------
#
class Matrix4(object):
    # -----------------------------------------------------------------------------
    #
    def __init__(self, *args, **kwargs):
        if len(args) == 0:
            self._data = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], dtype=flt_precision)
        elif len(args) == 1:
            arg = args[0]
            if isinstance(arg, collections.Iterable) and len(arg) == 16:
                self._data = np.array(arg, dtype=flt_precision)
            elif type(arg) == Matrix4:
                self._data = arg.array
            else:
                raise Exception('__init__ : could not create matrix: "{}" of type "{}"'.format(str(args[0]), str(type(args[0]))))
        else:
            raise Exception('__init__ : could not create matrix: "{}" of type "{}"'.format(str(args[0]), str(type(args[0]))))

        self._is_position = kwargs.get('position', 1)

    # -----------------------------------------------------------------------------
    #
    def __getattr__(self, name):
        map = { 0: 'm11', 1: 'm12', 2: 'm13', 3: 'm14', 4: 'm21', 5: 'm22', 6: 'm23', 7: 'm24', 8: 'm31', 9: 'm32', 10: 'm33', 11: 'm34', 12: 'm41', 13: 'm42', 14: 'm43', 15: 'm44' }

        for idx in map:
            if name == map[idx]:
                return self._data[idx]

        raise AttributeError('Attribute "{}" not found in Matrix4'.format(name))

    # -----------------------------------------------------------------------------
    #
    def __setattr__(self, name, val):
        if name == '_data':
            object.__setattr__(self, name, val)
            return

        map = { 0: 'm11', 1: 'm12', 2: 'm13', 3: 'm14', 4: 'm21', 5: 'm22', 6: 'm23', 7: 'm24', 8: 'm31', 9: 'm32', 10: 'm33', 11: 'm34', 12: 'm41', 13: 'm42', 14: 'm43', 15: 'm44' }

        for idx in map:
            if name == map[idx]:
                self._data[idx] = val
                return

        if name == 'pos':
            if type(val) == Matrix4:
                self._data[:] = val.array
            elif isinstance(val, collections.Iterable) and len(arg) == 16:
                self._data[:] = np.array(val)
            else:
                raise AttributeError('Attribute "{}" not found in Matrix4'.format(name))
        else:
            object.__setattr__(self, name, val)

    # -----------------------------------------------------------------------------
    #
    def __getitem__(self, n):
        return self._data[n]

    # -----------------------------------------------------------------------------
    #
    def __setitem__(self, n, val):
        self._data[n] = val

    # -----------------------------------------------------------------------------
    #
    def __eq__(self, v):
        if type(v) == Vector3:
            return np.allclose(self._data, v._data)
        else:
            return NotImplemented

    # -----------------------------------------------------------------------------
    #
    def __repr__(self):
        return ('<Matrix4: (\n  {:.5f}, {:.5f}, {:.5f}, {:.5f}\n  {:.5f}, {:.5f}, {:.5f}, {:.5f}\n  {:.5f}, {:.5f}, {:.5f}, {:.5f}\n  {:.5f}, {:.5f}, {:.5f}, {:.5f})>'.format(*self._data))

    # -----------------------------------------------------------------------------
    #
    def __str__(self):
        return self.__repr__()

    # -----------------------------------------------------------------------------
    #
    def set(self, n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44):
        self._data[ 0 ] = n11; self._data[ 4 ] = n12; self._data[ 8 ] = n13; self._data[ 12 ] = n14;
        self._data[ 1 ] = n21; self._data[ 5 ] = n22; self._data[ 9 ] = n23; self._data[ 13 ] = n24;
        self._data[ 2 ] = n31; self._data[ 6 ] = n32; self._data[ 10 ] = n33; self._data[ 14 ] = n34;
        self._data[ 3 ] = n41; self._data[ 7 ] = n42; self._data[ 11 ] = n43; self._data[ 15 ] = n44;

    # -----------------------------------------------------------------------------
    #
    def makeTranslation(self, x, y, z):
        self.set(
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        )

    # -----------------------------------------------------------------------------
    #
    def makeRotationX(self, theta):
        c = math.cos(theta)
        s = math.sin(theta);

        self.set(
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        )

    # -----------------------------------------------------------------------------
    #
    def makeRotationY(self, theta):
        c = math.cos(theta)
        s = math.sin(theta);

        self.set(
            c, 0, s, 0,
            0, 1, 0, 0,
           -s, 0, c, 0,
            0, 0, 0, 1
        )

    # -----------------------------------------------------------------------------
    #
    def makeRotationZ(self, theta):
        c = math.cos(theta)
        s = math.sin(theta);

        self.set(
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        )

    # -----------------------------------------------------------------------------
    #
    def multiplyMatrices(self, a, b):
        a11 = a[ 0 ]; a12 = a[ 4 ]; a13 = a[ 8 ]; a14 = a[ 12 ];
        a21 = a[ 1 ]; a22 = a[ 5 ]; a23 = a[ 9 ]; a24 = a[ 13 ];
        a31 = a[ 2 ]; a32 = a[ 6 ]; a33 = a[ 10 ]; a34 = a[ 14 ];
        a41 = a[ 3 ]; a42 = a[ 7 ]; a43 = a[ 11 ]; a44 = a[ 15 ];

        b11 = b[ 0 ]; b12 = b[ 4 ]; b13 = b[ 8 ]; b14 = b[ 12 ];
        b21 = b[ 1 ]; b22 = b[ 5 ]; b23 = b[ 9 ]; b24 = b[ 13 ];
        b31 = b[ 2 ]; b32 = b[ 6 ]; b33 = b[ 10 ]; b34 = b[ 14 ];
        b41 = b[ 3 ]; b42 = b[ 7 ]; b43 = b[ 11 ]; b44 = b[ 15 ];

        self._data[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        self._data[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        self._data[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        self._data[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        self._data[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        self._data[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        self._data[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        self._data[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        self._data[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        self._data[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        self._data[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        self._data[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        self._data[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        self._data[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        self._data[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        self._data[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    # -----------------------------------------------------------------------------
    #
    def identity(self):
        self.set(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );

    # -----------------------------------------------------------------------------
    #
    def getInverse(self, mat):
        #
        # based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
        n11 = mat[ 0 ]; n21 = mat[ 1 ]; n31 = mat[ 2 ]; n41 = mat[ 3 ];
        n12 = mat[ 4 ]; n22 = mat[ 5 ]; n32 = mat[ 6 ]; n42 = mat[ 7 ];
        n13 = mat[ 8 ]; n23 = mat[ 9 ]; n33 = mat[ 10 ]; n43 = mat[ 11 ];
        n14 = mat[ 12 ]; n24 = mat[ 13 ]; n34 = mat[ 14 ]; n44 = mat[ 15 ];

        t11 = (n23 * n34 * n42) - (n24 * n33 * n42) + (n24 * n32 * n43) - (n22 * n34 * n43) - (n23 * n32 * n44) + (n22 * n33 * n44);
        t12 = (n14 * n33 * n42) - (n13 * n34 * n42) - (n14 * n32 * n43) + (n12 * n34 * n43) + (n13 * n32 * n44) - (n12 * n33 * n44)
        t13 = (n13 * n24 * n42) - (n14 * n23 * n42) + (n14 * n22 * n43) - (n12 * n24 * n43) - (n13 * n22 * n44) + (n12 * n23 * n44);
        t14 = (n14 * n23 * n32) - (n13 * n24 * n32) - (n14 * n22 * n33) + (n12 * n24 * n33) + (n13 * n22 * n34) - (n12 * n23 * n34);

        det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

        if ( det == 0 ):
            if (throwOnDegenerate == True):
                raise Exception("getInverse(): cannot invert matrix, determinant is 0")
            else:
                console.log("getInverse(): cannot invert matrix, determinant is 0")
                self.identity()

            return

        detInv = 1.0 / det;

        self._data[ 0 ] = t11 * detInv;
        self._data[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
        self._data[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
        self._data[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

        self._data[ 4 ] = t12 * detInv;
        self._data[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
        self._data[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
        self._data[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

        self._data[ 8 ] = t13 * detInv;
        self._data[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
        self._data[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
        self._data[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

        self._data[ 12 ] = t14 * detInv;
        self._data[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
        self._data[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
        self._data[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

