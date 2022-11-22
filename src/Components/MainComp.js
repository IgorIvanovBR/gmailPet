import '../App.css';
import React, { useEffect, useState } from 'react'
import { gapi } from "gapi-script";
import axios from "axios";
import mailSvg from '../assets/email.svg';
import { encode, decode } from 'js-base64';
import { Card, CardBody, Button } from "reactstrap";

const MainComp = () => {

    const [ clientGoogleId, setClientGoogleId ] = useState('');
    const [ userGmailAccessToken, setUserGmailAccessToken ] = useState('');
    const [ foldersList, setFoldersList ] = useState([]);
    const [ mailList, setMailList ] = useState([])
    const [ emailForPreview, setEmailForPreview ] = useState({});
    const [ currentFolder, setCurrentFolder ] = useState('');
    const [ nameOfUser, setNameOfUser ] = useState('');
    const [ nextPageToken, setNextPageToken ] = useState('');
    const [ pageOfMails, setPageOfMails ] = useState(0);
    const [ arrayOfTokens, setArrayOfTokens ] = useState([]);
    const maximumEmails = 50;

    useEffect( () => {
        const _onInit = auth2 => {
            console.log('init OK', auth2)
        }
        const _onError = err => {
            console.log('error', err)
        }
        window.gapi.load('auth2', function() {
            window.gapi.auth2
                .init({
                    client_id:
                    process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    'scope': 'https://mail.google.com/'
                })
                .then(_onInit, _onError)
        })
    },[] )

    const signIn = () => {
        const auth2 = window.gapi.auth2.getAuthInstance()
        auth2.signIn().then(googleUser => {
            const profile = googleUser.getBasicProfile();
            const id_token = googleUser.getAuthResponse().id_token
            const access_token = googleUser.getAuthResponse().access_token
            setNameOfUser(profile.getName())
            setClientGoogleId(profile.getId());
            setUserGmailAccessToken(access_token);
        })
    }

    useEffect( () => {
        if(clientGoogleId) {
            axios.get(`https://gmail.googleapis.com/gmail/v1/users/${clientGoogleId}/labels`,
                { headers: { Authorization: `Bearer ${userGmailAccessToken}` }}
            ).then((response) => {
                // filtering folders that are useless for us
                setFoldersList(response.data.labels.filter( (element) => element.labelListVisibility !== 'labelHide'));
            })
        }
    },[clientGoogleId])


    const openNeededFolder = (folderId ) => {
        setNextPageToken('new');
        setCurrentFolder(folderId);
        setPageOfMails(0);
        setArrayOfTokens([]);
    }

    useEffect( () => {
        if(currentFolder.length >0) {
            getListOfEmail(currentFolder);
        }
    }, [currentFolder])



    const getListOfEmail = (folderId, pageToken) => {
        axios.get(`https://gmail.googleapis.com/gmail/v1/users/${clientGoogleId}/messages`,
            { headers: { Authorization: `Bearer ${userGmailAccessToken}` },
                params: {labelIds: `${folderId || currentFolder}`, maxResults: `${maximumEmails}`, pageToken: `${pageToken || ''}`}
            }
        ).then((response) => {
            if(arrayOfTokens.length > 0) {
                setArrayOfTokens([...arrayOfTokens, nextPageToken]);
            } else {
                setArrayOfTokens([nextPageToken]);
            }
            if(response?.data?.nextPageToken && response?.data?.nextPageToken.length > 0) {
                setNextPageToken(response.data.nextPageToken);
            } else {
                setNextPageToken('');
            }
            getDataOfEmail(response.data.messages)
        })
    }

    const getPrevListOfEmail = ( folderId, pageToken) => {
        axios.get(`https://gmail.googleapis.com/gmail/v1/users/${clientGoogleId}/messages`,
            { headers: { Authorization: `Bearer ${userGmailAccessToken}` },
                params: {labelIds: `${folderId || currentFolder}`, maxResults: `${maximumEmails}`, pageToken: `${pageToken || ''}`}
            }
        ).then((response) => {
            if(response?.data?.nextPageToken && response?.data?.nextPageToken.length > 0) {
                setNextPageToken(response.data.nextPageToken);
            } else {
                setNextPageToken('');
            }
            getDataOfEmail(response.data.messages)
        })
    }

    const nextPage = () => {
        setPageOfMails(pageOfMails+1);
        getListOfEmail(currentFolder,nextPageToken);
    };

    const previousPage = () => {
        const prevPageId = pageOfMails-1;
        setPageOfMails(pageOfMails-1)
        getPrevListOfEmail(currentFolder, pageOfMails > 1 ? arrayOfTokens[prevPageId] : '');
    };

    const  getDataOfEmail  =  (emailIds) => {
        let emailList = [];
        if(emailIds && emailIds.length > 0) {
            emailIds.forEach((emailId) => {
                axios.get(` https://gmail.googleapis.com/gmail/v1/users/${clientGoogleId}/messages/${emailId.id}`,
                    {headers: {Authorization: `Bearer ${userGmailAccessToken}`}}
                ).then((response) => {
                    return emailList.push(response.data);
                }).finally(function () {
                    if (emailList.length === emailIds.length) {
                        setMailList(emailList);
                    }
                })
            })
        } else {
            setMailList([]);
        }
    }

    const getEmailPreview = (emailId)  => {
        axios.get(`https://gmail.googleapis.com/gmail/v1/users/${clientGoogleId}/messages/${emailId}`,
            { headers: { Authorization: `Bearer ${userGmailAccessToken}` },
            }
        ).then((response) => {
            setEmailForPreview(response);
        })
    }

    const defineButtonColor = (folderName) => {
        let color = '';
        switch (true){
            case (folderName === 'SPAM'):
                color = 'danger';
                break;
            case (folderName === 'DRAFT'):
                color = 'warning';
                break;
            case (folderName === 'INBOX'):
                color = 'success';
                break;
            default:
                color = 'primary';
                break
        }
        return color;
    }

    return (
            <div  className='container-fluid flex-grow-1' style={{padding: 0}}>
                <Card className='mb-4' id='appCard'>
                    <CardBody className='wrapperCard'>
                        <div id='elementsWrapper'>
                            {!clientGoogleId &&
                                <div id='loginBlock'>
                                    <img src={mailSvg} className='mailSvg' alt="mail logo" />
                                    <button className='loginButton' onClick={(event) => signIn()}>
                                        <span>Log in</span></button>
                                </div>
                            }
                            <div id='emailsBlockWrapper' className='row'>
                                {nameOfUser.length > 0 &&
                                    <h3 id='userGreet'>Hello {nameOfUser}!</h3>
                                }
                                <div id='foldersList' className=' col-md-2'>
                                    {foldersList.map( (folder) => {
                                        return(
                                            <div
                                                className='folderWrapper'
                                                key={folder?.name}
                                                onClick={ event =>  openNeededFolder(folder?.id)}
                                                   >
                                                <Button
                                                    className='folderButtons'
                                                    color={defineButtonColor(folder?.name)}
                                                    outline
                                                >
                                                    {folder?.name}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className=' col-md-4'>
                                    <div id={mailList.length > 0 ? 'mailsList' : 'emptyMailList'}>
                                        {mailList.length > 0 && mailList.map((email) => {
                                            return(
                                                <div
                                                    className='mailsList'
                                                    onClick={event => getEmailPreview(email?.id)}
                                                    key={email?.id}
                                                >
                                                    <p>
                                                        <span>Date: {email?.payload?.headers.filter( (element) => element?.name === 'Date')?.[0]?.value}</span>
                                                        <br />
                                                        <span>Theme: {email?.payload?.headers.filter( (element) => element?.name === 'Subject')?.[0]?.value}</span>
                                                    </p>
                                                    <hr />
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {mailList.length > 0 &&
                                        <div id='buttonsBlock'>
                                            <Button
                                                className='paginationButtons'
                                                color={ pageOfMails > 0 ? 'primary' : ''}
                                                disabled={pageOfMails === 0}
                                                outline
                                                onClick={previousPage}
                                            >
                                                <span>{'<'} </span>
                                            </Button>
                                            <span>{pageOfMails +1}</span>
                                            <Button
                                                className='paginationButtons'
                                                color={ nextPageToken.length > 0 ? 'primary' : ''}
                                                outline
                                                disabled={nextPageToken.length === 0}
                                                onClick={nextPage}
                                            >
                                                <span> {'>'}</span>
                                            </Button>
                                        </div>
                                    }
                                </div>
                                <div id='messagePreview' className='col-md-6'>
                                    {emailForPreview?.data?.id.length > 0 &&
                                        <div id='previewBody'>
                                            <p>
                                                <span>Subject: {emailForPreview?.data?.payload?.headers.filter((element) => element?.name === 'Subject')?.[0]?.value}</span><br/>
                                                <span>From: {emailForPreview?.data?.payload?.headers.filter((element) => element?.name === 'From')?.[0]?.value}</span><br/>
                                                <span>To: {emailForPreview?.data?.payload?.headers.filter((element) => element?.name === 'To')?.[0]?.value}</span><br/>
                                                <span>Message: {emailForPreview?.data?.payload?.parts[0].body.data ? decode(emailForPreview?.data?.payload?.parts[0].body.data) : 'Message part is empty.'}</span>
                                            </p>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
    );
};

export default MainComp;
