module.exports = function(grunt) {
    grunt.initConfig({
        // Merge the JS files
        concat: {
            options: {
                separator: "\n\n"
            },
            dist: {
                src: ["src/header.js", "src/prototypes.js", "src/interval.js", "src/*.js"],
                dest: "main.js"
            }
        },
        watch: {
            scripts: {
                files: ["src/*.js"],
                tasks: ["concat"],
                options: {
                    spawn: false
                }
            }
        }
    });

    // Import the required files
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-watch");

    // Set default task to do everything
    grunt.registerTask("default", ["concat"]);
};

