import json
import ast
import numpy as np
from collections import defaultdict
from enum import Enum
from math import ceil, floor
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
        self.agent = data['agent']
        self.phase = data['ctx']["phase"]
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
        }
        self.target_list = self.agents.get(self.state.agent)()
        print('THE TARGET LIST =', self.target_list)


    def return_format(self, move_list):
        response = defaultdict(list)
        for tup in move_list:
            response['moves'].append({'name': tup[0], 'sourceId': tup[1], 'destId': tup[2], 'numSoldiers': tup[3]})
        return json.dumps(response)

    def passive_agent(self):
        if self.state.phase == "Occupation":
            # return any un-occupied country
            country_to_occupy =  self.state.dict_player_cities[None][0]
            return self.return_format([("occupy", country_to_occupy, 0, 1)])
        elif self.state.phase == "Reinforce Countries":
            weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN)
            return self.return_format([("reinforce", weakest_city, 0, 1)])
        elif self.state.phase == "War":
            weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN)
            return self.return_format([("reinforce", weakest_city, 0, self.state.unassigned_units)])
        return self.return_format([("can't find any moves", 0, 0, self.state.unassigned_units)])

    def pacifist_agent(self):
        weakest_city = self.state.get_city(Player.CURRENT, Troops.MIN)
        weakest_opponent = self.state.get_city(Player.NOT_CURRENT, Troops.MIN)
        possible_attacking_cities = []

        for city in self.state.opponent_adj_list[weakest_opponent]:
            if self.state.current_player == self.state.get_player_of_city(city):
                possible_attacking_cities.append(city)
        
        if len(possible_attacking_cities) != 0:
            possible_troops = self.state.get_troops_of_cities(possible_attacking_cities)
            attacker = possible_attacking_cities[np.argmax(possible_troops)]
            return self.return_format([
                ("reinforce", weakest_city, 0, self.state.unassigned_units),
                ("attack", attacker, weakest_opponent, 0)
            ])
        
        return self.return_format([
            ("reinforce", weakest_city, 0, self.state.unassigned_units)
        ])


    def aggressive_agent(self):
        strongest_city = self.state.get_city(Player.CURRENT, Troops.MAX)
        troops_in_strongest_city = self.state.dict_city_troops[strongest_city]

        adjacent_opponents = self.state.opponent_adj_list[strongest_city]
        adjacent_troops = self.state.get_troops_of_cities(adjacent_opponents)
        # aggressive agent will attack his strongest opponent
        # but must have less troops than his strongest city
        for idx, adj_troop in enumerate(adjacent_troops):
            if adj_troop >= troops_in_strongest_city:
                del adjacent_opponents[idx]
                del adjacent_troops[idx]
        
        if len(adjacent_opponents) != 0:
            destination = adjacent_opponents[np.argmax(adjacent_troops)]
            return self.return_format([
                ("reinforce", strongest_city, 0, self.state.unassigned_units),
                ("attack", strongest_city, destination, 0)
            ])
        return self.return_format([
            ("reinforce", strongest_city, 0, self.state.unassigned_units)
        ])

    def informed_search(self, informed_type):
        node = Node(self.state, None, None, 0, 0)

        if self.problem.goal_test(node.state):
            return node, "success"

        frontier_heap = Heap()
        frontier_heap.add(node, priority=node.path_cost)
        heap_realtime = Heap()

        while True:
            if not frontier_heap.pq:
                if informed_type == Informed.A_STAR_REALTIME:
                    _, min_ = heap_realtime.pop()
                    return min_, "empty, realtime"
                else:
                    return node, "empty, normal"

            cost, node = frontier_heap.pop()
            if self.problem.goal_test(node.state):
                return node, "success"
            if informed_type == Informed.A_STAR_REALTIME:
                if node.depth < 4:
                    for action in self.problem.get_actions(node.state):
                        child = self.problem.child_node(node, action)
                        child_path_to_goal = self.function.total_BSR(child.state)
                        child_total_path = child.path_cost + child_path_to_goal
                        frontier_heap.add(child, priority=child_total_path)
                else:
                    heap_realtime.add(node, priority=cost)
            
            elif informed_type == Informed.GREEDY:
                for action in self.problem.get_actions(node.state):
                    child = self.problem.child_node(node, action)
                    child_path_to_goal = self.function.total_BSR(child.state)
                    frontier_heap.add(child, priority=child_path_to_goal)
            
            else: # Informed.A_STAR_NORMAL
                for action in self.problem.get_actions(node.state):
                    child = self.problem.child_node(node, action)
                    child_path_to_goal = self.function.total_BSR(child.state)
                    child_total_path = child.path_cost + child_path_to_goal
                    frontier_heap.add(child, priority=child_total_path)
            
    def greedy_agent(self):
        moves = self.ai_reinforce()
        node, output = self.informed_search(Informed.GREEDY)
        if output == 'success':
            attack = self.back_track(node)    
            moves.append(("attack", attack[0], attack[1], 0))
        return self.return_format(moves)
    
    def A_star_agent(self):
        moves = self.ai_reinforce()
        node, output = self.informed_search(Informed.A_STAR_NORMAL)
        if output == 'success':
            attack = self.back_track(node)    
            moves.append(("attack", attack[0], attack[1], 0))
        return self.return_format(moves)
    
    def A_star_realtime_agent(self):
        moves = self.ai_reinforce()
        node, _ = self.informed_search(Informed.A_STAR_REALTIME)
        attack = self.back_track(node)
        moves.append(("attack", attack[0], attack[1], 0))
        return moves
    
    def back_track(self, node):
        steps = list()
        while node.parent != None:
            steps.append(node.action)
            node = node.parent
        step = steps[-1].split('_')
        attack = []
        for string in step:
            attack.append(int(string))
        return attack

    def ai_reinforce(self):
        search_cities = self.state.dict_player_cities[self.state.current_player]
        city_bsr = {}
        for city in search_cities:
            try:
                city_bsr[city] = self.function.BSR(self.state, city, self.state.opponent_adj_list[city])
            except:
                continue
        city_NBSR = self.function.NBSR(city_bsr)
        moves = []
        for id_ in city_NBSR:
            val = min(ceil(city_NBSR[id_] * self.state.unassigned_units), self.state.unassigned_units)
            self.state.unassigned_units -= val
            self.state.dict_city_troops[id_] += val
            moves.append(("reinforce", id_ , 0, val))
        return moves


class Functions:
    def heuristic(self, state):
        search_cities = state.dict_player_cities[state.current_player]
        # print('Search cities for heuristics =', search_cities)
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
            if nbsr[key] >= 1/3:
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
            attack.append(int(string))
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
            nbsr1 = bsr1 / (bsr1 + bsr2)
            # nbsr2 = bsr2 / (bsr1 + bsr2)
        val = next_state.dict_city_troops[attack[0]]
        next_state.dict_city_troops[attack[0]] = floor(val * nbsr1) if floor(val * nbsr1) >= 1 else 1 
        next_state.dict_city_troops[attack[1]] = val - next_state.dict_city_troops[attack[0]]
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