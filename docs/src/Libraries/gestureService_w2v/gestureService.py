# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import json, operator
import numpy as np
import socket

sys.path.append(os.path.dirname(__file__))
import word2vec

#
# SETUP: http://www.nltk.org/data.html

from nltk.tokenize import sent_tokenize, word_tokenize
from gensim.models import KeyedVectors

import xmlrpc.client

verbose_level = 0
useWord2Vec_Server = False

# -----------------------------------------------------------------------------
#
class GestureService:
    # -----------------------------------------------------------------------------
    #
    def __init__(self, **args):
        self.context = args.get('context')
        if (self.context is None):
            self.context = "gestureService"

        if (not useWord2Vec_Server):
            self.w2v = word2vec.word2vec()
            self.server = None
        else:
            #
            # connecting to word2vec_server...
            print("Connecting to local word2vec server...")
            host = socket.gethostbyname("localhost")
            addr = "http://" + host + ":8700" # 'http://127.0.0.1:8700')

            self.server = xmlrpc.client.ServerProxy(addr)
            self.w2v = None

        print("Loading and parsing labanotation gesture dictionary...")
        self.actionTags, self.labans, self.wordsInActionTags = self.read_tag_word_laban_file()

        self.currentWordIndex = 0
        self.triggerWordIndex = 0
        self.selectedGesture = None

    # -----------------------------------------------------------------------------
    #
    def close(self):
        pass

    # -----------------------------------------------------------------------------
    #
    def txt2list(self, filename):
        f = open(filename)
        data = f.read()
        f.close()
        lines = data.split('\n')
        lines = [x.rstrip() for x in lines]
        return lines

    # -----------------------------------------------------------------------------
    #
    def read_tag_word_laban_file(self):
        path = os.path.split(os.path.realpath(__file__))[0]

        filename = path + '/tag_lab_word.txt'
        tags = []
        laban_names = []
        words = []
        data_list = self.txt2list(filename)

        for data in data_list:
            if data == '':
                continue
            else:
                temp = data.split(":")
                tags.append(temp[0])
                laban_names.append(temp[1].split("|"))
                words.append(temp[2].split("|"))

        return tags, laban_names, words

    # -----------------------------------------------------------------------------
    #
    def getActionTags(self):
        return self.actionTags

    # -----------------------------------------------------------------------------
    #
    def getWordsInActionTags(self):
        return self.wordsInActionTags

    # -----------------------------------------------------------------------------
    #
    def getLabans(self):
        return self.labans

    # -----------------------------------------------------------------------------
    #
    def tokenizeMessage(self, phrases):
        return sent_tokenize(phrases)

    # -----------------------------------------------------------------------------
    #
    def tokenizePhrase(self, phrase):
        return word_tokenize(phrase)

    # -----------------------------------------------------------------------------
    #
    def findGesture(self, wordList):
        if (verbose_level > 1):
            print("#----------------------------#")
            print("word list")
            print(wordList)

        if (not useWord2Vec_Server):
            mat_word2vec_similarity = self.w2v.mat_similarity(self.wordsInActionTags, wordList)
        else:
            try:
                data = self.server.mat_similarity_serialized(self.wordsInActionTags, wordList)
            except Exception as e:
                print("Exception communicating with RPC server: ", e)
                return None, None, None

            mat_word2vec_similarity = np.array(data)

        #filtering
        #if     similarity < threshold_a: similarity = 0
        #elif similarity > threshold_b: similarity = 1
        #else similarity changes linear.
        threshold_a = 0.4
        threshold_b = 0.7
        mat_word2vec_similarity = ( mat_word2vec_similarity - threshold_a ) * ( 1. / ( threshold_b - threshold_a ))
        mat_word2vec_similarity[mat_word2vec_similarity < 0 ] = 0.
        mat_word2vec_similarity[mat_word2vec_similarity > 1 ] = 1.

        if (verbose_level > 1):
            print("#----------------------------#")
            print("word2vec similarity matrix")
            print(mat_word2vec_similarity)

        sum_similarity = np.sum(mat_word2vec_similarity, axis = 1)

        if (verbose_level > 1):
            print("#----------------------------#")
            for i, tag in enumerate(self.actionTags):
                print(tag + ': ' + str(sum_similarity[i]))

        if sum_similarity.max() == 0:
            sum_similarity[0] = 2.0

        action_candidate = sum_similarity > (sum_similarity.max() * 0.95)

        if (verbose_level > 1):
            print("#----------------------------#")
            print("candidates of action")
            for i, t_f in enumerate(action_candidate):
                if t_f == True:
                    print(self.actionTags[i])

        rand = np.random.random( sum_similarity.shape )
        selected_action_num = (action_candidate * rand).argmax()

        if (verbose_level > 1):
            print("#----------------------------#")
            print("selected action: " + self.actionTags[selected_action_num])

        selected_laban_name = self.labans[selected_action_num][np.random.randint(len(self.labans[selected_action_num]))]
        if (verbose_level > 0):
            print("selected labanotation: " + selected_laban_name)

        trigger_word_num = mat_word2vec_similarity[selected_action_num,:].argmax()

        if (verbose_level > 0):
            print("#----------------------------#")
            if (verbose_level > 1):
                print(mat_word2vec_similarity[selected_action_num,:])
            print("trigger_word: " + wordList[trigger_word_num])

        if (verbose_level > 2):
            print("#----------------------------#")
            print(mat_word2vec_similarity)

        if (verbose_level > 2):
            print("#----------------------------#")
            print("selected_laban: " + selected_laban_name)
            print("trigger_word_num: " + str(trigger_word_num) + "(" + wordList[trigger_word_num] + ")")

        return selected_laban_name, mat_word2vec_similarity[selected_action_num,:], trigger_word_num
