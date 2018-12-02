from __future__ import division
import json
import ast
import numpy as np
import operator
from collections import defaultdict
from enum import Enum
from math import ceil, floor, inf
from heap import Heap
from copy import deepcopy

# Flags used later, defined by Enums here
class Player(Enum):
    CURRENT = 0
    NOT_CURRENT = 1

class Troops(Enum):
    MIN = 0
    MAX = 1

class Informed(Enum):
    A_STAR_NORMAL = 0
    A_STAR_REALTIME = 1
    GREEDY = 2

class State:
    def __init__(self, data):
        self.current_player = str(data['ctx']['currentPlayer'])
        self.cities = data['G']['countries']
        self.adj_list = data['adjacencyList']
        for city in self.adj_list:
            self.adj_list[city] = [str(x) for x in self.adj_list[city]]
        self.agent = data['agent']
        self.phase = data['ctx']['phase']
        self.unassigned_units = data['G']['unassignedUnits'][self.current_player]
        self.dict_player_cities, self.dict_city_troops = self.seperate_cities()
        self.opponent_adj_list = self.get_opponent_neighbours()

    # given a city's id, it returns its owner (player_id)
    def get_player_of_city(self, city_id):
        for owner in self.dict_player_cities:
            if city_id in self.dict_player_cities[owner]:
                return owner

    # returns a list of cities not occupied by the current player
    def get_opponent_cities(self):
        opponent_cities = []
        for player_id in self.dict_player_cities:
            if player_id != self.current_player:
                for city in self.dict_player_cities[player_id]:
                    opponent_cities.append(city)
        return opponent_cities

    # given a list of cities' ids,
    # it returns a list of corresponding troops in each city
    def get_troops_of_cities(self, cities_ids):
        troops = []
        for city_id in cities_ids:
            troops.append(self.dict_city_troops[city_id])
        return troops

    # return the city with least or most troops
    # for the current player or his opponents
    def get_city(self, player_flag, troops_flag):
        # cities of current player
        if player_flag == Player.CURRENT:
            cities = self.dict_player_cities[self.current_player]
        # cities against current player
        else:
            cities = self.get_opponent_cities()
        troops = self.get_troops_of_cities(cities)
        # return city from cities with least troops
        if troops_flag == Troops.MIN:
            return cities[np.argmin(troops)]
        # or with max troops
        return cities[np.argmax(troops)]

    def seperate_cities(self):
        match_owner_cities_id = defaultdict(list)
        dict_id_troop = {}
        for city_id in self.cities:
            match_owner_cities_id[self.cities[city_id]['owner']].append(city_id)
            dict_id_troop[city_id] = self.cities[city_id]['soldiers']
        return dict(match_owner_cities_id), dict_id_troop

    def get_opponent_neighbours(self):
        opponent_adj_list = defaultdict(list)
        for city_id in self.adj_list:
            for neighbour_id in self.adj_list[city_id]:
                if self.get_player_of_city(city_id) != self.get_player_of_city(neighbour_id):
                    opponent_adj_list[city_id].append(neighbour_id)
        return dict(opponent_adj_list)


class Node:
    def __init__(self, state, parent, action, path_cost, depth):
        self.state = state
        self.children = dict()
        self.parent = parent
        self.action = action
        self.path_cost = path_cost
        self.depth = depth

    def __lt__(self, other):
        return self.path_cost < other.path_cost


class Agent:
    def __init__(self, data):
        self.state = State(data)
        self.function = Functions()
        self.problem = Problem()
        self.agents = {
            'passive': self.passive_agent,
            'pacifist': self.pacifist_agent,
            'aggressive': self.aggressive_agent,
            'greedy': self.greedy_agent,
            'A_star': self.A_star_agent,
            'A_star_realtime': self.A_star_realtime_agent,
            'minimax': self.minimax
        }
        self.target_list = self.agents.get(self.state.agent)()
        print('THE TARGET LIST =', self.target_list)

    def return_format(self, move_list):
        response = defaultdict(list)
        for tup in move_list:
            response['moves'].append({'name': tup[0], 'sourceId': tup[1], 'destId': tup[2], 'numSoldiers': tup[3]})
        return json.dumps(response)

    def occupy(self):
        country_to_occupy =  self.state.dict_player_cities[None][0]
        return self.return_format([("occupy", country_to_occupy, 0, 1)])

    def reinforce_weakest(self):
        weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN)
        return self.return_format([("reinforce", weakest_city, 0, 1)])

    def reinforce_strongest(self):
        strongest_city = self.state.get_city(Player.CURRENT, Troops.MAX)
        return self.return_format([("reinforce", strongest_city, 0, 1)])

    def redistribute_troops(self, city1, city2):
        died_troops = self.state.dict_city_troops[city2] # troops that will die
        self.state.dict_city_troops[city1] -= died_troops
        self.state.dict_city_troops[city2] = 0
        owner = self.state.get_player_of_city(city2)
        # append to the new player
        self.state.dict_player_cities[self.state.current_player].append(city2)
        # remove from the old player
        self.state.dict_player_cities[owner].remove(city2)
        # invert opponent lists
        self.state.opponent_adj_list = self.state.get_opponent_neighbours()
        # redistribute troops
        try:
            bsr1 = self.function.BSR_(self.state, city1, self.state.opponent_adj_list[city1], 1)
        except:
            bsr1 = 0
        try:
            bsr2 = self.function.BSR_(self.state, city2, self.state.opponent_adj_list[city2], 1)
        except:
            bsr2 = 0
        if bsr1 == 0 and bsr2 == 0:
            nbsr1 = 0.5 # nbsr2 = 0.5
        else:
            nbsr1 = bsr1 / (bsr1 + bsr2)       # nbsr2 = bsr2 / (bsr1 + bsr2)
        val = self.state.dict_city_troops[city1]
        val1 = floor(val * nbsr1) if floor(val * nbsr1) >= 1 else 1
        if val > val1:
            self.state.dict_city_troops[city1] = val1
        else: # val = val1
            self.state.dict_city_troops[city1] = val1 - 1
        self.state.dict_city_troops[city2] = val - self.state.dict_city_troops[city1]
        return self.state.dict_city_troops[city2]

    def passive_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.reinforce_weakest()
        elif self.state.phase == "War":
            weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN)
            return self.return_format([("reinforce", weakest_city, 0, self.state.unassigned_units)])
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def pacifist_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.reinforce_weakest()
        elif self.state.phase == "War":
            weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN) # to reinforce
            self.state.dict_city_troops[weakest_city] += self.state.unassigned_units
            # during war, it attacks an opponent city which has least troops (if it can)
            opponent_cities = self.state.get_opponent_cities() # current player's nonoccupied cities
            opponent_troops = self.state.get_troops_of_cities(opponent_cities)
            # sort cities according to their number of troops ascendingly
            tuples = []
            for idx, city in enumerate(opponent_cities):
                tuples.append((city, opponent_troops[idx]))
            tuples.sort(key=lambda x:x[1])
            for pair in tuples:
                possible_attackers = []
                if pair[0] in self.state.opponent_adj_list:
                    for possible_attacker in self.state.opponent_adj_list[pair[0]]:
                        if self.state.current_player == self.state.get_player_of_city(possible_attacker) and self.state.dict_city_troops[possible_attacker] > self.state.dict_city_troops[pair[0]] + 1:
                            possible_attackers.append(possible_attacker)
                    if len(possible_attackers) != 0:
                        possible_troops = self.state.get_troops_of_cities(possible_attackers)
                        attacker = possible_attackers[np.argmax(possible_troops)]
                        return self.return_format([
                            ("reinforce", weakest_city, 0, self.state.unassigned_units),
                            ("attack", attacker, pair[0], self.redistribute_troops(attacker, pair[0]))
                        ])
            # can't attack any city at all
            return self.return_format([
                ("reinforce", weakest_city, 0, self.state.unassigned_units)
            ])
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def minimax(self):
      node = Node(self.state, None, None, 0, 0)
      child, _ = maximize(self, node, -inf, inf)
      attack = self.back_track(node)
      moves = ("attack", attack[0], attack[1], self.redistribute_troops(attack[0], attack[1]))
      return self.return_format(moves)

    def _minimize(self, node, alpha, beta, depth):
      goal_test = self.problem.minimax_goal_test(node.state)
      if  goal_test != 0:
        return None, goal_test

      if depth >= 10:
        return node, self.problem.eval(node.state)

      minChild, minUtil = None, inf

      for action in self.problem.get_actions(node.state):
        child = self.problem.child_node(node, action)

        _, util = self._maximize(child, alpha, beta, depth + 1)

        if util < minUtil:
          minChild, minUtil = child, util

        if minUtil <= alpha:
          break

        if minUtil < beta:
          beta = minUtil

      return minChild, minUtil

    def _maximize(self, node, alpha, beta, depth):
      goal_test = self.problem.minimax_goal_test(node.state)
      if  goal_test != 0:
        return None, goal_test

      if depth >= 10:
        return node, self.problem.eval(node.state)

      maxChild, maxUtil = None, -inf

      for action in self.problem.get_actions(node.state):
        child = self.problem.child_node(node, action)
         _, util = self._minimize(child, alpha, beta, depth + 1)

         if util > maxUtil:
           maxChild, maxUtil = child, util

          if maxUtil >= beta:
            break

          if maxUtil > alpha:
            alpha = maxUtil

      return maxChild, maxUtil

    def aggressive_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.reinforce_strongest()
        elif self.state.phase == "War":
            strongest_city = self.state.get_city(Player.CURRENT, Troops.MAX)
            self.state.dict_city_troops[strongest_city] += self.state.unassigned_units
            if strongest_city in self.state.opponent_adj_list:
                troops_in_strongest_city = self.state.dict_city_troops[strongest_city]
                adjacent_opponents = self.state.opponent_adj_list[strongest_city]
                adjacent_troops = self.state.get_troops_of_cities(adjacent_opponents)
                # aggressive agentself will attack his strongest opponent whose troops
                # must be less by two or more than those in agent's strongest city
                for idx, adj_troop in enumerate(adjacent_troops):
                    if adj_troop >= troops_in_strongest_city - 1:
                        del adjacent_opponents[idx]
                        del adjacent_troops[idx]
                if len(adjacent_opponents) != 0:
                    destination = adjacent_opponents[np.argmax(adjacent_troops)]
                    return self.return_format([
                        ("reinforce", strongest_city, 0, self.state.unassigned_units),
                        ("attack", strongest_city, destination, self.redistribute_troops(strongest_city, destination))
                    ])
            return self.return_format([
                ("reinforce", strongest_city, 0, self.state.unassigned_units)
            ])
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def informed_search(self, informed_type):
        node = Node(self.state, None, None, 0, 0)
        if self.problem.goal_test(node.state):
            return node, "success"
        frontier_heap = Heap()
        frontier_heap.add(node, priority=node.path_cost)
        heap_limit = Heap()
        while True:
            if not frontier_heap.pq:
                if informed_type == Informed.GREEDY:
                    return node, "empty, greedy"
                else:
                    if not heap_limit.pq:
                        return None, "empty, failure"
                    else:
                        _, min_ = heap_limit.pop()
                        return min_, "empty, reached limit"

            cost, node = frontier_heap.pop()
            if self.problem.goal_test(node.state):
                return node, "success"

            if informed_type == Informed.GREEDY:
                for action in self.problem.get_actions(node.state):
                    child = self.problem.child_node(node, action)
                    child_path_to_goal = self.function.total_BSR(child.state)
                    frontier_heap.add(child, priority=child_path_to_goal)

            else: # Informed.A_STAR_REALTIME or Informed.A_STAR_NORMAL
                limit = 3 if informed_type == Informed.A_STAR_REALTIME else 10
                if node.depth < limit:
                    for action in self.problem.get_actions(node.state):
                        child = self.problem.child_node(node, action)
                        child_path_to_goal = self.function.total_BSR(child.state)
                        child_total_path = child.path_cost + child_path_to_goal
                        frontier_heap.add(child, priority=child_total_path)
                else:
                    heap_limit.add(node, priority=cost)

    def greedy_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.return_format(ai_reinforce(self.state, 1))
        elif self.state.phase == "War":
            moves = ai_reinforce(self.state, self.state.unassigned_units)
            node, output = self.informed_search(Informed.GREEDY)
            print('========================> THE OUTPUT IS', output)
            if output == 'success':
                attack = self.back_track(node)
                moves.append(("attack", attack[0], attack[1], self.redistribute_troops(attack[0], attack[1])))
            return self.return_format(moves)
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def A_star_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.return_format(ai_reinforce(self.state, 1))
        elif self.state.phase == "War":
            moves = ai_reinforce(self.state, self.state.unassigned_units)
            node, output = self.informed_search(Informed.A_STAR_NORMAL)
            print('========================> THE OUTPUT IS', output)
            if node != None:
                attack = self.back_track(node)
                moves.append(("attack", attack[0], attack[1], self.redistribute_troops(attack[0], attack[1])))
            return self.return_format(moves)
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def A_star_realtime_agent(self):
        if self.state.phase == "Occupation":
            return self.occupy()
        elif self.state.phase == "Reinforce Countries":
            return self.return_format(ai_reinforce(self.state, 1))
        elif self.state.phase == "War":
            moves = ai_reinforce(self.state, self.state.unassigned_units)
            node, output = self.informed_search(Informed.A_STAR_REALTIME)
            print('========================> THE OUTPUT IS', output)
            if node != None:
                attack = self.back_track(node)
                moves.append(("attack", attack[0], attack[1], self.redistribute_troops(attack[0], attack[1])))
            return self.return_format(moves)
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def back_track(self, node):
        steps = list()
        while node.parent != None:
            steps.append(node.action)
            node = node.parent
        step = steps[-1].split('_')
        attack = []
        for string in step:
            attack.append(string)
        return attack

def ai_reinforce(state, unassigned_units):
    function = Functions()
    search_cities = state.dict_player_cities[state.current_player]
    city_bsr = {}
    for city in search_cities:
        try:
            city_bsr[city] = function.BSR(state, city, state.opponent_adj_list[city])
        except:
            continue
    city_NBSR = function.NBSR(city_bsr)
    sorted_NBSR = sorted(city_NBSR.items(), key=operator.itemgetter(1), reverse=True)
    moves = []
    for tup in sorted_NBSR:
        if unassigned_units == 0:
            return moves
        val = ceil(tup[1] * unassigned_units)
        if val != 0:
            unassigned_units -= val
            state.dict_city_troops[tup[0]] += val
            moves.append(("reinforce", tup[0] , 0, val))
    return moves


class Functions:
    def heuristic(self, state):
        search_cities = state.dict_player_cities[state.current_player]
        opponent_BSR = {}
        for city in search_cities:
            try:
                opponents = state.opponent_adj_list[city]
            except:
                continue
            for opponent in opponents:
                if opponent not in opponent_BSR:
                    opponent_BSR[opponent] = self.BSR(state, opponent, state.opponent_adj_list[opponent])
        opponent_NBSR = self.NBSR(opponent_BSR)
        return opponent_BSR, opponent_NBSR


    def BSR(self, state, city_id, opponents):
        sum = 0
        for opponent_id in opponents:
            sum += state.dict_city_troops[opponent_id]
        return sum / state.dict_city_troops[city_id]


    def BSR_(self, state, city_id, opponents, num_troops):
        sum = 0
        for opponent_id in opponents:
            sum += state.dict_city_troops[opponent_id]
        return sum / num_troops


    def NBSR(self, dict_BSR):
        sum = 0
        for val in dict_BSR :
            sum += dict_BSR[val]
        dict_NBSR = {}
        for val in dict_BSR :
            dict_NBSR[val] = dict_BSR[val] / sum
        return dict_NBSR


    def total_BSR(self, state):
        total = 0
        for city in state.dict_player_cities[state.current_player]:
            if city in state.opponent_adj_list:
                total += self.BSR(state, city, state.opponent_adj_list[city])
        return total


    def threshold(self, state, bsr, nbsr):
        target_attack = []
        attack = []
        for key in nbsr:
            if nbsr[key] >= 1/10:
                target_attack.append(key)
                source = self.best_one_can_attack(state, key)
                if source != 0:
                    attack.append(("attack", source, key, 0))
        return attack


    def best_one_can_attack(self, state, key):
        search_city = state.opponent_adj_list[key]
        max_val = -1
        max_id = 0
        for id_ in search_city:
            if max_val < state.dict_city_troops[id_] and state.dict_city_troops[id_] > state.dict_city_troops[key] + 1:
                max_val = state.dict_city_troops[id_]
                max_id = id_
        return max_id


class Problem:
    def __init__(self):
        self.function = Functions()


    def next_state(self, current_state, action):
        attacks = action.split('_')
        attack = []
        for string in attacks:
            attack.append(string)
        next_state = deepcopy(current_state)
        cost = next_state.dict_city_troops[attack[1]] # troops that will die
        next_state.dict_city_troops[attack[0]] -= next_state.dict_city_troops[attack[1]]
        next_state.dict_city_troops[attack[1]] = 0

        owner = next_state.get_player_of_city(attack[1])
        # append to the new player
        next_state.dict_player_cities[next_state.current_player].append(attack[1])
        # remove from the old player
        next_state.dict_player_cities[owner].remove(attack[1])
        # invert opponent
        next_state.opponent_adj_list = next_state.get_opponent_neighbours()
        # redistribute troops
        try:
            bsr1 = self.function.BSR_(next_state, attack[0], current_state.opponent_adj_list[attack[0]], 1)
        except:
            bsr1 = 0
        try:
            bsr2 = self.function.BSR_(next_state, attack[1], current_state.opponent_adj_list[attack[1]], 1)
        except:
            bsr2 = 0
        if bsr1 == 0 and bsr2 == 0:
            nbsr1 = 0.5 # nbsr2 = 0.5
        else:
            nbsr1 = bsr1 / (bsr1 + bsr2)    # nbsr2 = bsr2 / (bsr1 + bsr2)

        val = next_state.dict_city_troops[attack[0]]
        val1 = floor(val * nbsr1) if floor(val * nbsr1) >= 1 else 1
        if val > val1:
            next_state.dict_city_troops[attack[0]] = val1
        else: # val = val1
            next_state.dict_city_troops[attack[0]] = val1 - 1
        next_state.dict_city_troops[attack[1]] = val - next_state.dict_city_troops[attack[0]]
        next_state.unassigned_units = max(len(next_state.dict_player_cities[next_state.current_player]) // 3, 3)
        ai_reinforce(next_state, next_state.unassigned_units)
        return next_state, cost

    def goal_test(self, state):
        for player in state.dict_player_cities:
            if player != state.current_player and len(state.dict_player_cities[player]) != 0:
                return False
        return True

    def get_actions(self, state):
        BSR, NBSR = self.function.heuristic(state)
        attacks = self.function.threshold(state, BSR, NBSR)
        actions = []
        for attack in attacks:
            action = str(attack[1]) + '_' + str(attack[2])
            actions.append(action)
        return actions

    def child_node(self, node, action):
        next_state, cost = self.next_state(node.state, action)
        return Node(next_state, node, action, node.path_cost + cost, node.depth + 1)

    def eval(self, state):
      my_soldiers_count = sum(state.get_troops_of_cities(state.dict_player_cities[state.current_player]))
      opponent_soldiers_count = sum(state.get_troops_of_cities(state.get_opponent_cities()))

      my_cities_count = len(state.dict_player_cities[state.current_player]))
      opponent_cities_count = len(state.get_opponent_cities())

      return 2 * (0.5 * my_soldiers_count / (my_soldiers_count + opponent_soldiers_count) + 0.5 * my_cities_count / (my_cities_count + opponent_cities_count) ) - 1

      def minimax_goal_test(self, state):
        '''
        returns 1 if current player wins, -1 if opponent wins, 0 otherwise
        '''
        if len(state.dict_player_cities) > 1:
          return 0
        if state.current_player in state.dict_player_cities:
          return 1
        return -1


