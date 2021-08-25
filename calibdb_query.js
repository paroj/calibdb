'use strict'
// SPDX-License-Identifier: MIT
// Copyright (c) 2021 Pavel Rojtberg

/**
 * Query calibdb.net for calibration data.
 * @param {string} camera_id
 * @param {number[]} resolution: width, height
 * @param {number} api_key
 * @returns {Promise<Object>}
 */
function calibdb_query(camera_id, imsize, api_key) {
    let data = { "camera": camera_id, "userAgent": navigator.userAgent, "imsize": imsize, "api_key": api_key }

    // send data to server
    let xhttp = new XMLHttpRequest()
    xhttp.responseType = "json"
    xhttp.open("POST", "https://calibdb.net/query", true)

    let promise = new Promise((resolve, reject) => {
        xhttp.onreadystatechange = function () {
            if (this.readyState != XMLHttpRequest.DONE)
                return;

            if (this.status != 200) {
                reject("calibdb query failed with status: " + this.status)
                return
            }
            if ("error" in this.response) {
                reject(this.response.error)
                return
            }

            resolve(this.response)
        }
    })

    xhttp.send(JSON.stringify(data))

    return promise
}

async function getCamera() {
    // Prefer camera resolution nearest to 1280x720 - just as calibdb does
    let constraints = { audio: false, video: { width: 1280, height: 720, facingMode: "environment", resizeMode: "none" } }

    let mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    const track = mediaStream.getVideoTracks()[0]
    const cfg = track.getSettings()

    return [track.label, [cfg.width, cfg.height]]
}

function showCalibration(calib) {
    calib.calibration_time = new Date(calib.calibration_time * 1000).toUTCString()
    let calib_str = JSON.stringify(calib, undefined, 4)
    document.getElementById("calib").textContent = calib_str
}

// get in touch to receive a valid API key
const API_KEY = 0

function init() {
    getCamera()
        .then(async args => {
            let [camera_id, resolution] = args
            let ret = await calibdb_query(camera_id, resolution, API_KEY)

            if ("calib" in ret) {
                showCalibration(ret["calib"])
            }
            else {
                alert(`no calibration for ${camera_id} available. Visit calibdb.net to create one.`)
            }
        })
        .catch(err => {
            if (["NotFoundError", "NotAllowedError"].indexOf(err.name) > -1) {
                alert("No camera detected! Make sure that a camera is attached and you gave camera permission to this site.")
                return
            }
            // something else
            alert(err)
        })
}

init()