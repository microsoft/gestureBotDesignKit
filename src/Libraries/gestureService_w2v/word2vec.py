# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import os
import sys
import time

import gensim
from gensim.models import word2vec as w2v
from gensim.models import KeyedVectors

import numpy as np
import os

# -----------------------------------------------------------------------------
#
class word2vec:
    # -----------------------------------------------------------------------------
    #
    def __init__(self):
        path = os.path.split(os.path.realpath(__file__))[0]

        if (True):
            filepath = os.path.join(os.path.split(os.path.realpath(__file__))[0], 'GoogleNews-vectors-negative300.bin')
        else:
            filepath = os.path.join(os.path.split(os.path.realpath(__file__))[0], 'GoogleNews-vectors-negative300.bin.gz')

        print("loading '" + filepath + "'...")

        start = time.time()

        self.model = gensim.models.KeyedVectors.load_word2vec_format(filepath, binary = True)

        end = time.time()

        print("word vector database took " + str(end-start) + " seconds to load...")

    # -----------------------------------------------------------------------------
    #
    def similarity(self, wordA, wordB):
        try:
            return self.model.similarity(wordA, wordB)

        except:
            if wordA == wordB:
                return 1.
            else:
                return 0.

    # -----------------------------------------------------------------------------
    #
    def category_similarity(self, word_list, word):
        similarity_list = np.zeros(len(word_list))
        for i, category_word in enumerate(word_list):
            similarity_list[i] = self.similarity(category_word, word)

        return similarity_list.max()


    # -----------------------------------------------------------------------------
    #
    def mat_similarity_serialized(self, listA, listB):
        arr = self.mat_similarity(listA, listB)

        return arr.tolist()

    # -----------------------------------------------------------------------------
    #
    def mat_similarity(self, listA, listB):
        """
        listA = [['word1_category1', 'word2_category1', ...],
        ['word1_category2', ...],
        :
        :
        ['word1_categoryN', ...]]

        listB = ['word1', 'word2', ..., 'wordM']

        Then, return the matrix of similarity
  
        numpy.array([[similarity(category1, word1), similarity(category1, word2), ...],
        [similarity(category2, word1), similarity(category2, word2), ...]
        :
        :
        [similarity(categoryN, word1), ..., similarity(categoryN, wordM)]])
        """

        mat = np.zeros([len(listA), len(listB)])
        for i, categoryA in enumerate(listA):
            for j, word in enumerate(listB):
                mat[i,j] = self.category_similarity(categoryA, word)

        return mat

    # -----------------------------------------------------------------------------
    #
    def mat_similarity2(self, listA, listB):
        """
        listA = [wordA1, wordA2, ..., wordAN]

        listB = [wordB1, wordB2, ..., wordBM]

        Then, return the matrix of similarity
  
        numpy.array([[similarity(wordA1, wordB1), similarity(wordA2, wordB2), ...],
        [similarity(wordA2, wordB1), similarity(wordA2, wordB2), ...]
        :
        :
        [similarity(wordAN, wordB1), ..., similarity(wordAN, wordBM)]])
        """

        mat = np.zeros([len(listA), len(listB)])
        for i, wordA in enumerate(listA):
            for j, wordB in enumerate(listB):
                mat[i,j] = self.similarity(wordA, wordB)

        return mat

