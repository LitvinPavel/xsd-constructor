<template>
  <div id="app">
    <DynamicForm />
  </div>
</template>

<script setup lang="ts">
import DynamicForm from './components/DynamicForm.vue';
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
  color: white;
  padding: 40px 20px;
  text-align: center;
}

.app-header h1 {
  margin-bottom: 10px;
  font-size: 2.5em;
  font-weight: 300;
}

.app-header p {
  font-size: 1.1em;
  opacity: 0.9;
}

.app-main {
  padding: 20px;
}
</style>
